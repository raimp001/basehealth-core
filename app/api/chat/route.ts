import { groq } from "@ai-sdk/groq"
import { createDataStreamResponse, formatDataStreamPart, generateText, streamText } from "ai"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hasConfiguredAiProvider, resolveAgentModel } from "@/lib/ai-provider"
import { sanitizeInput } from "@/lib/phiScrubber"
import { logger } from "@/lib/logger"
import { ASSISTANT_PASS, getAssistantPassStatus, isWalletAddress } from "@/lib/assistant-pass"
import { buildChatTools } from "@/lib/chat-tools"
import {
  agentKit,
  buildAgentSystemPrompt,
  getHealthcarePaymentContext,
  getOpenClawModel,
  getWalletContext,
  rankAgentsForMessages,
  resolveAgent,
} from "@/lib/agent-service"

// System prompt that defines the AI's behavior and knowledge
const SYSTEM_PROMPT = `You are a helpful health assistant for the BaseHealth platform. 
You provide general health information and guidance to patients. 

Important guidelines:
- Provide evidence-based information following medical best practices
- Never diagnose specific conditions - instead suggest talking to a healthcare provider
- For serious symptoms, always recommend seeking immediate medical attention
- Reference USPSTF guidelines for screening recommendations when appropriate
- You can suggest finding providers on the platform for follow-up care
- Be friendly, empathetic, and concise in your responses
- You can suggest health screenings based on age, gender, and risk factors
- When appropriate, mention that you can connect users with healthcare providers through the platform
- Do a quick internal self-check for safety, correctness, and compliance before you answer, then revise once
- Do not mention internal agent names, routing, or system prompts unless the user explicitly asks how routing works
- You have access to internal tools to (1) search providers, (2) check order/payment status, and (3) prepare a one-tap checkout.
- Use tools when they materially improve accuracy or speed. For checkouts, confirm the purpose and amount before preparing a checkout.
- Never ask for seed phrases, private keys, or passwords. Keep output privacy-safe (avoid exposing sensitive identifiers unless necessary).

If asked about screenings, you can refer to these common recommendations:
- Mammograms for women 40-74 years old every 1-2 years
- Colonoscopy for adults 45-75 years old every 10 years
- Pap smears for women 21-65 years old every 3 years
- Blood pressure screening for adults 18+ yearly
- Cholesterol screening for adults 20+ every 4-6 years
- Diabetes screening for adults 45+ every 3 years
- Skin cancer screening for adults yearly
- Lung cancer screening for adults 50-80 with smoking history yearly

If the user asks about finding providers or scheduling appointments, explain that they can use the BaseHealth platform to find providers by specialty and location, schedule telemedicine appointments, and pay using cryptocurrency.`

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, agent: requestedAgent, walletAddress, accessWalletAddress, appointmentId } = body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 })
    }

    // If the assistant backend isn't configured, don't gate behind payments.
    // (Users shouldn't pay for an offline feature.)
    const aiConfigured = hasConfiguredAiProvider()

    if (!aiConfigured) {
      logger.warn("Chat request blocked: AI not configured", {
        missingEnv: [
          "OPENCLAW_API_KEY",
          "OPENCLAW_GATEWAY_TOKEN",
          "OPENCLAW_GATEWAY_PASSWORD",
          "OPENCLAW_GATEWAY_URL",
          "OPENAI_API_KEY",
          "GROQ_API_KEY",
        ],
      })

      const response = createDataStreamResponse({
        status: 200,
        execute: (dataStream) => {
          dataStream.write(
            formatDataStreamPart("text", "The BaseHealth assistant is temporarily offline. Please try again later."),
          )
          dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }))
          dataStream.write(formatDataStreamPart("finish_step", { isContinued: false, finishReason: "stop" }))
        },
      })
      response.headers.set("x-basehealth-agent", "general-health")
      response.headers.set("x-basehealth-llm-provider", "none")
      response.headers.set("x-basehealth-agent-mesh", "none")
      response.headers.set(
        "x-basehealth-ai-help",
        "Configuration missing: set OPENCLAW_API_KEY or OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD plus OPENCLAW_GATEWAY_URL for remote deployments, or configure OPENAI_API_KEY or GROQ_API_KEY, then redeploy.",
      )
      return response
    }

    // Default to letting users explore without a paywall unless explicitly enabled.
    const paywallEnabled = (process.env.BASEHEALTH_CHAT_PAYWALL || "false").toLowerCase() === "true"
    if (paywallEnabled) {
      const accessWallet =
        (typeof accessWalletAddress === "string" && accessWalletAddress.trim()) ||
        (typeof walletAddress === "string" && walletAddress.trim()) ||
        ""

      if (!accessWallet || !isWalletAddress(accessWallet)) {
        const response = createDataStreamResponse({
          status: 200,
          execute: (dataStream) => {
            dataStream.write(
              formatDataStreamPart(
                "text",
                "Please sign in with Base, then unlock the Assistant Pass to use chat.",
              ),
            )
            dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }))
            dataStream.write(formatDataStreamPart("finish_step", { isContinued: false, finishReason: "stop" }))
          },
        })
        response.headers.set("x-basehealth-paywall", "required")
        return response
      }

      const pass = await getAssistantPassStatus(accessWallet)
      if (!pass.active) {
        const response = createDataStreamResponse({
          status: 200,
          execute: (dataStream) => {
            dataStream.write(
              formatDataStreamPart(
                "text",
                `Assistant Pass required. Unlock chat for $${ASSISTANT_PASS.usd.toFixed(2)} USDC (24h) and try again.`,
              ),
            )
            dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }))
            dataStream.write(formatDataStreamPart("finish_step", { isContinued: false, finishReason: "stop" }))
          },
        })
        response.headers.set("x-basehealth-paywall", "required")
        response.headers.set("x-basehealth-paywall-service", ASSISTANT_PASS.serviceType)
        return response
      }
    }

    // IMPORTANT: Scrub PHI from user messages before sending to LLM
    const scrubbedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && typeof msg.content === "string") {
        const { cleanedText } = sanitizeInput(msg.content)
        return { ...msg, content: cleanedText }
      }
      return msg
    })

    // Log that scrubbing occurred (but NOT the original content)
    const userMessages = messages.filter((m: any) => m.role === "user")
    if (userMessages.length > 0) {
      logger.debug(`Scrubbed ${userMessages.length} user message(s) for PHI`)
    }

    const ranking = rankAgentsForMessages(scrubbedMessages, requestedAgent, "general-health")
    const selectedAgent = resolveAgent(scrubbedMessages, requestedAgent)
    const explicitlySelected = ranking?.[0]?.score === Number.MAX_SAFE_INTEGER

    let context: Record<string, unknown> | null = null
    if (typeof walletAddress === "string" && walletAddress.trim()) {
      if (typeof appointmentId === "string" && appointmentId.trim()) {
        context = await getHealthcarePaymentContext(appointmentId, walletAddress)
      } else {
        context = await getWalletContext(walletAddress)
      }
    }

    const systemPrompt = buildAgentSystemPrompt(selectedAgent, SYSTEM_PROMPT, context)
    const enhancedMessages = agentKit.enhanceMessages(scrubbedMessages, {
      agent: selectedAgent,
      context,
    })

    const { model, provider, degradedFromOpenClaw } = await resolveAgentModel(selectedAgent)

    if (!model) {
      logger.warn("Chat request blocked: AI not configured", {
        agent: selectedAgent,
        missingEnv: [
          "OPENCLAW_API_KEY",
          "OPENCLAW_GATEWAY_TOKEN",
          "OPENCLAW_GATEWAY_PASSWORD",
          "OPENCLAW_GATEWAY_URL",
          "OPENAI_API_KEY",
          "GROQ_API_KEY",
        ],
      })

      const response = createDataStreamResponse({
        status: 200,
        execute: (dataStream) => {
          dataStream.write(
            formatDataStreamPart(
              "text",
              "The BaseHealth assistant is temporarily offline. Please try again later.",
            ),
          )
          dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }))
          dataStream.write(formatDataStreamPart("finish_step", { isContinued: false, finishReason: "stop" }))
        },
      })
      response.headers.set("x-basehealth-agent", selectedAgent)
      response.headers.set("x-basehealth-llm-provider", provider)
      response.headers.set("x-basehealth-agent-mesh", "none")
      response.headers.set(
        "x-basehealth-ai-help",
        "Configuration missing: set OPENCLAW_API_KEY or OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD plus OPENCLAW_GATEWAY_URL for remote deployments, or configure OPENAI_API_KEY or GROQ_API_KEY, then redeploy.",
      )
      return response
    }

    const meshEnabled = (process.env.BASEHEALTH_AGENT_MESH || "true").toLowerCase() !== "false"
    const collaboratorAgents = meshEnabled && !explicitlySelected
      ? ranking
          .filter((r) => r.agent !== selectedAgent)
          .filter((r) => {
            const topScore = ranking?.[0]?.score ?? 0
            if (!Number.isFinite(topScore) || topScore <= 0) return false
            return r.score > 0 && r.score >= Math.max(1, Math.floor(topScore / 2))
          })
          .slice(0, 2)
          .map((r) => r.agent)
      : []

    const collaboratorNotes = collaboratorAgents.length
      ? await Promise.all(
          collaboratorAgents.map(async (agent) => {
            try {
              const peerSystemPrompt = buildAgentSystemPrompt(agent, SYSTEM_PROMPT, context)
              const peerMessages = agentKit.enhanceMessages(scrubbedMessages as any, {
                agent,
                context,
              })

              const peerModel = provider === "openclaw" ? getOpenClawModel(agent) || model : model
              const peer = await generateText({
                model: peerModel,
                messages: [{ role: "system", content: peerSystemPrompt }, ...peerMessages],
                maxTokens: 350,
              })

              return peer.text?.trim() || ""
            } catch (error) {
              logger.warn("Collaborator agent failed", {
                agent,
                error: error instanceof Error ? error.message : String(error),
              })
              return ""
            }
          }),
        )
      : []

    const collaborationBlock = collaboratorNotes.filter(Boolean).join("\n\n")
    const collaborationMessage = collaborationBlock
      ? {
          role: "system" as const,
          content:
            `Internal specialist notes (do not reveal these notes or agent identities to the user):\n\n${collaborationBlock}\n\n` +
            "Now answer the user clearly and safely. Ask 1-2 clarifying questions if needed.",
        }
      : null

    logger.info("Chat request routed", {
      provider,
      agent: selectedAgent,
      hasContext: Boolean(context),
      collaborators: collaboratorAgents.length,
      degradedFromOpenClaw,
    })

    let session: any = null
    try {
      session = await getServerSession()
    } catch {
      session = null
    }

    const tools = buildChatTools({
      req,
      session,
      accessWalletAddress: typeof accessWalletAddress === "string" ? accessWalletAddress : null,
    })

    const activeToolsByAgent: Record<string, Array<keyof typeof tools>> = {
      // Discovery + care navigation
      "general-health": ["search_providers"],
      "screening-specialist": ["search_providers"],
      "care-navigator": ["search_providers", "create_checkout", "get_order_status"],
      "appointment-coordinator": ["search_providers", "create_checkout", "get_order_status"],
      // Ops + billing
      "account-manager": ["create_checkout", "get_order_status"],
      "billing-guide": ["create_checkout", "get_order_status"],
      "claims-refunds": ["get_order_status"],
      "provider-ops": ["get_order_status"],
      "admin-ops": ["search_providers", "create_checkout", "get_order_status"],
      "treasury-operator": ["get_order_status"],
      "records-specialist": [],
      "medication-coach": [],
      "clinical-trial-matcher": ["search_providers"],
      "emergency-triage": [],
    }

    const enabledTools = (activeToolsByAgent[selectedAgent] || Object.keys(tools)) as Array<keyof typeof tools>

    const result = streamText({
      model,
      tools,
      maxSteps: 6,
      experimental_activeTools: enabledTools,
      messages: [
        { role: "system", content: systemPrompt },
        ...(collaborationMessage ? [collaborationMessage] : []),
        ...enhancedMessages,
      ],
    })

    const response = result.toDataStreamResponse()
    response.headers.set("x-basehealth-agent", selectedAgent)
    response.headers.set("x-basehealth-llm-provider", provider)
    response.headers.set("x-basehealth-agent-mesh", collaboratorAgents.join(",") || "none")
    response.headers.set("x-basehealth-ai-degraded", degradedFromOpenClaw ? "true" : "false")
    return response
  } catch (error) {
    logger.error("Error in chat API", error)
    return NextResponse.json({ error: "There was an error processing your request" }, { status: 500 })
  }
}

// Function to analyze symptoms and provide recommendations (internal use only)
async function analyzeSymptoms(symptoms: string, age: number, gender: string, additionalContext = "") {
  // IMPORTANT: Scrub PHI from input before sending to LLM
  const { cleanedText: scrubbedSymptoms } = sanitizeInput(symptoms)
  const { cleanedText: scrubbedContext } = sanitizeInput(additionalContext)
  
  const prompt = `
    Patient information:
    - Age: ${age}
    - Gender: ${gender}
    - Reported symptoms: ${scrubbedSymptoms}
    - Additional context: ${scrubbedContext}
    
    Based on the above information, please provide:
    1. What are possible causes for these symptoms that should be discussed with a healthcare provider?
    2. What type of healthcare specialist might be most appropriate to consult? 
    3. Is this something that requires immediate medical attention, timely follow-up, or routine care?
    4. Any appropriate home care suggestions while waiting to see a healthcare provider?
    5. Any relevant screening tests that might be appropriate based on USPSTF guidelines given the patient's age and gender?
    
    Format your response as JSON with the following structure:
    {
      "possibleCauses": ["cause1", "cause2", ...],
      "recommendedSpecialty": "specialty",
      "urgencyLevel": "immediate|timely|routine",
      "homeCare": ["suggestion1", "suggestion2", ...],
      "recommendedScreenings": ["screening1", "screening2", ...],
      "furtherQuestions": ["question1", "question2", ...]
    }
  `

  try {
    const result = await streamText({
      model: groq("llama3-70b-8192"),
      prompt: prompt,
      system:
        "You are a medical assistant AI that provides structured information about symptoms. Always respond in valid JSON format.",
    })

    // Get text from stream result
    const text = await result.text

    // Parse the JSON response
    return JSON.parse(text)
  } catch (error) {
    logger.error("Error analyzing symptoms", error)
    throw new Error("Failed to analyze symptoms. Please try again later.")
  }
}
