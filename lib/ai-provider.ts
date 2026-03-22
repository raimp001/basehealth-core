import "server-only"

import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import type { OpenClawAgentId } from "@/lib/openclaw-agent-catalog"
import { getOpenClawModel } from "@/lib/agent-service"

export type ResolvedAiProvider = "openclaw" | "openai" | "groq" | "none"

const OPENCLAW_GATEWAY_URL = (process.env.OPENCLAW_GATEWAY_URL || "https://gateway.openclaw.ai")
  .trim()
  .replace(/\/$/, "")
  .replace(/\/v1$/, "")

const OPENCLAW_GATEWAY_AGENT_ID = (process.env.OPENCLAW_GATEWAY_AGENT_ID || "main").trim()

let cachedOpenClawHealth: { checkedAt: number; healthy: boolean } | null = null

function getOpenClawCredential(): string {
  return (
    process.env.OPENCLAW_API_KEY ||
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.OPENCLAW_GATEWAY_PASSWORD ||
    ""
  ).trim()
}

export function hasConfiguredAiProvider(): boolean {
  return Boolean(getOpenClawCredential() || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY)
}

export async function probeOpenClawGateway(timeoutMs = 1500, maxAgeMs = 60_000): Promise<boolean> {
  const credential = getOpenClawCredential()
  if (!credential) return false

  const now = Date.now()
  if (cachedOpenClawHealth && now - cachedOpenClawHealth.checkedAt < maxAgeMs) {
    return cachedOpenClawHealth.healthy
  }

  try {
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential}`,
        "Content-Type": "application/json",
        ...(OPENCLAW_GATEWAY_AGENT_ID ? { "x-openclaw-agent-id": OPENCLAW_GATEWAY_AGENT_ID } : {}),
      },
      body: JSON.stringify({ model: "openclaw", messages: [] }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })

    const healthy = response.status !== 401 && response.status !== 403 && response.status !== 404
    cachedOpenClawHealth = { checkedAt: now, healthy }
    return healthy
  } catch {
    cachedOpenClawHealth = { checkedAt: now, healthy: false }
    return false
  }
}

export async function resolveAgentModel(agent: OpenClawAgentId): Promise<{
  model: any | null
  provider: ResolvedAiProvider
  degradedFromOpenClaw: boolean
}> {
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim()
  const groqKey = (process.env.GROQ_API_KEY || "").trim()
  const fallbackOpenAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini"
  const fallbackGroqModel = process.env.GROQ_MODEL || "llama3-70b-8192"
  const openClawConfigured = Boolean(getOpenClawCredential())
  const fallbackAvailable = Boolean(openAiKey || groqKey)

  if (openClawConfigured) {
    const canUseOpenClaw = fallbackAvailable ? await probeOpenClawGateway() : true
    if (canUseOpenClaw) {
      return {
        model: getOpenClawModel(agent),
        provider: "openclaw",
        degradedFromOpenClaw: false,
      }
    }
  }

  if (openAiKey) {
    return {
      model: openai(fallbackOpenAiModel),
      provider: "openai",
      degradedFromOpenClaw: openClawConfigured,
    }
  }

  if (groqKey) {
    return {
      model: groq(fallbackGroqModel),
      provider: "groq",
      degradedFromOpenClaw: openClawConfigured,
    }
  }

  if (openClawConfigured) {
    return {
      model: getOpenClawModel(agent),
      provider: "openclaw",
      degradedFromOpenClaw: false,
    }
  }

  return { model: null, provider: "none", degradedFromOpenClaw: false }
}

export async function resolveBasicModel(options?: {
  openAiModel?: string
  groqModel?: string
}): Promise<{
  model: any | null
  provider: ResolvedAiProvider
}> {
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim()
  const groqKey = (process.env.GROQ_API_KEY || "").trim()
  const openAiModel = options?.openAiModel || process.env.OPENAI_MODEL || "gpt-4o"
  const groqModel = options?.groqModel || process.env.GROQ_MODEL || "llama3-70b-8192"

  if (openAiKey) {
    return { model: openai(openAiModel), provider: "openai" }
  }

  if (groqKey) {
    return { model: groq(groqModel), provider: "groq" }
  }

  return { model: null, provider: "none" }
}
