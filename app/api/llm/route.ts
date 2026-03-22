/**
 * Central LLM API Route
 * 
 * This route handles all LLM/AI calls from the frontend.
 * It ensures:
 * 1. All user input is scrubbed of PHI before being sent to OpenAI
 * 2. API keys are never exposed to the client
 * 3. Proper error handling and logging (without PHI)
 * 
 * IMPORTANT: This route should NEVER log raw user input.
 */

import { NextRequest, NextResponse } from "next/server"
import { generateText, streamText } from "ai"
import { resolveBasicModel } from "@/lib/ai-provider"
import { sanitizeInput } from "@/lib/phiScrubber"
import { logger } from "@/lib/logger"

// Maximum duration for streaming responses
export const maxDuration = 30

interface LLMRequest {
  input: string
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
    systemPrompt?: string
  }
}

/**
 * POST /api/llm
 * 
 * Accepts user input, scrubs PHI, calls OpenAI, and returns response
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let success = false

  try {
    const body: LLMRequest = await req.json()
    const { input, options = {} } = body

    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid input: input is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    // IMPORTANT: Scrub PHI from input before any processing
    const { cleanedText, mapping } = sanitizeInput(input.trim())

    // Log that scrubbing occurred (but NOT the original text)
    logger.debug(`Input scrubbed: ${Object.keys(mapping).length} PHI elements detected`)

    // Check if API key is configured
    const { model, provider } = await resolveBasicModel({
      openAiModel: options.model || "gpt-4o",
      groqModel: options.model || process.env.GROQ_MODEL || "llama3-70b-8192",
    })

    if (!model) {
      logger.error("No AI provider configured")
      return NextResponse.json(
        { error: "AI service is not configured. Please contact support." },
        { status: 500 }
      )
    }

    // Prepare system prompt (if provided)
    const systemPrompt = options.systemPrompt || 
      "You are a helpful assistant. Provide accurate and helpful responses."

    // Prepare generation options
    const temperature = options.temperature ?? 0.7
    const maxTokens = options.maxTokens ?? 2000
    const shouldStream = options.stream ?? false

    // If streaming is requested, return stream
    if (shouldStream) {
      const result = streamText({
        model,
        system: systemPrompt,
        prompt: cleanedText, // ONLY send scrubbed text
        temperature,
        maxTokens,
      })

      success = true
      return result.toDataStreamResponse()
    }

    // Otherwise, return complete response
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: cleanedText, // ONLY send scrubbed text
      temperature,
      maxTokens,
    })

    success = true
    const duration = Date.now() - startTime

    // Log success (without PHI)
    logger.info(`Request completed successfully`, { duration: `${duration}ms`, provider })

    return NextResponse.json({
      success: true,
      text: result.text,
      usage: result.usage,
      // Include scrubbing info for debugging (but not the mapping itself)
      scrubbed: Object.keys(mapping).length > 0,
      phiElementsDetected: Object.keys(mapping).length,
    })

  } catch (error) {
    const duration = Date.now() - startTime
    success = false

    // Log error (without any user input)
    logger.error(`Error after ${duration}ms`, error)

    return NextResponse.json(
      {
        error: "An error occurred while processing your request. Please try again.",
        success: false,
      },
      { status: 500 }
    )
  } finally {
    // Final logging (without PHI)
    if (!success) {
      logger.warn(`Request failed after ${Date.now() - startTime}ms`)
    }
  }
}
