import "server-only"

import { groq } from "@ai-sdk/groq"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { getAutoResearchConfig, getProviderOrder } from "@/lib/autoresearch/config"
import type { AutoResearchProvider, AutoResearchSettings } from "@/lib/autoresearch/types"

export type AutoResearchProviderCandidate = {
  provider: Exclude<AutoResearchProvider, "none">
  model: any
  modelName: string
}

function getOpenClawCandidate(config = getAutoResearchConfig()): AutoResearchProviderCandidate | null {
  const apiKey = process.env.OPENCLAW_API_KEY || process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_PASSWORD
  if (!apiKey) return null

  const modelName =
    process.env.OPENCLAW_RESEARCH_MODEL || process.env.OPENCLAW_MODEL_ADMIN_OPS || process.env.OPENCLAW_MODEL || "gpt-4o-mini"
  const gatewayAgentId = (process.env.OPENCLAW_GATEWAY_AGENT_ID || "main").trim()

  const client = createOpenAI({
    apiKey,
    baseURL: `${config.openclawGatewayUrl}/v1`,
    headers: gatewayAgentId ? { "x-openclaw-agent-id": gatewayAgentId } : undefined,
  })

  return {
    provider: "openclaw",
    model: client(modelName),
    modelName,
  }
}

function getOpenAiCandidate(): AutoResearchProviderCandidate | null {
  if (!process.env.OPENAI_API_KEY) return null
  const modelName = process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"
  return {
    provider: "openai",
    model: openai(modelName),
    modelName,
  }
}

function getGroqCandidate(): AutoResearchProviderCandidate | null {
  if (!process.env.GROQ_API_KEY) return null
  const modelName = process.env.GROQ_RESEARCH_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
  return {
    provider: "groq",
    model: groq(modelName),
    modelName,
  }
}

export function getAutoResearchProviderCandidates(settings: AutoResearchSettings): AutoResearchProviderCandidate[] {
  const config = getAutoResearchConfig()
  const candidatesByProvider: Record<string, AutoResearchProviderCandidate | null> = {
    openclaw: getOpenClawCandidate(config),
    openai: getOpenAiCandidate(),
    groq: getGroqCandidate(),
  }

  return getProviderOrder(settings.providerPreference)
    .map((provider) => candidatesByProvider[provider])
    .filter((candidate): candidate is AutoResearchProviderCandidate => Boolean(candidate))
}
