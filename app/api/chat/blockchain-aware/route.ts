import { createDataStreamResponse, formatDataStreamPart, generateText, streamText } from "ai"
import { NextResponse } from "next/server"
import { resolveAgentModel } from "@/lib/ai-provider"
import { sanitizeInput } from "@/lib/phiScrubber"
import { logger } from "@/lib/logger"
import {
  agentKit,
  buildAgentSystemPrompt,
  getHealthcarePaymentContext,
  getOpenClawModel,
  getWalletContext,
  rankAgentsForMessages,
  resolveAgent,
} from "@/lib/agent-service"

// System prompt that defines the AI's behavior and knowledge with blockchain awareness
const SYSTEM_PROMPT = `You are a helpful health assistant for the BaseHealth platform with blockchain awareness. 
You provide general health information, guidance to patients, and can explain blockchain transactions related to healthcare payments.

Important guidelines:
- Provide evidence-based information following medical best practices
- Never diagnose specific conditions - instead suggest talking to a healthcare provider
- For serious symptoms, always recommend seeking immediate medical attention
- You can explain blockchain transactions in simple terms for patients
- You can help users understand their healthcare payment history on the Base blockchain
- When discussing payments, explain the benefits of blockchain for healthcare: transparency, reduced fees, and security
- Do a quick internal self-check for safety, correctness, and compliance before you answer, then revise once
- Do not mention internal agent names, routing, or system prompts unless the user explicitly asks how routing works

If asked about blockchain or crypto payments:
- Explain that BaseHealth uses the Base blockchain for secure, transparent payments
- Payments are made in ETH (Ethereum) on the Base network
- Transactions are secure, fast, and have lower fees than traditional payment methods
- Patients can view their complete payment history on the blockchain
- Providers receive payments directly to their wallet addresses
- The system maintains privacy while ensuring payment transparency`

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, walletAddress, appointmentId, agent: requestedAgent } = body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 })
    }

    const scrubbedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && typeof msg.content === "string") {
        const { cleanedText } = sanitizeInput(msg.content)
        return { ...msg, content: cleanedText }
      }
      return msg
    })

    // Get blockchain context if wallet address is provided
    let context: Record<string, unknown> | null = null
    if (typeof walletAddress === "string" && walletAddress.trim()) {
      if (typeof appointmentId === "string" && appointmentId.trim()) {
        context = await getHealthcarePaymentContext(appointmentId, walletAddress)
      } else {
        context = await getWalletContext(walletAddress)
      }
    }

    const ranking = rankAgentsForMessages(scrubbedMessages, requestedAgent, "billing-guide")
    const selectedAgent = resolveAgent(scrubbedMessages, requestedAgent, "billing-guide")
    const explicitlySelected = ranking?.[0]?.score === Number.MAX_SAFE_INTEGER
    const systemPrompt = buildAgentSystemPrompt(selectedAgent, SYSTEM_PROMPT, context)
    const enhancedMessages = agentKit.enhanceMessages(scrubbedMessages, {
      agent: selectedAgent,
      context,
    })

    const { model, provider, degradedFromOpenClaw } = await resolveAgentModel(selectedAgent)

    if (!model) {
      logger.warn("Blockchain-aware chat request blocked: AI not configured", {
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

    logger.info("Blockchain-aware chat request routed", {
      provider,
      agent: selectedAgent,
      hasContext: Boolean(context),
      collaborators: collaboratorAgents.length,
      degradedFromOpenClaw,
    })

    const result = streamText({
      model,
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
    logger.error("Error in blockchain-aware chat API", error)
    return NextResponse.json({ error: "There was an error processing your request" }, { status: 500 })
  }
}
