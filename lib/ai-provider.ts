import "server-only"

import { openai } from "@ai-sdk/openai"
import { groq } from "@ai-sdk/groq"
import type { OpenClawAgentId } from "@/lib/openclaw-agent-catalog"
import { getOpenClawModel } from "@/lib/agent-service"
import {
  getConfiguredPrimaryAiProvider,
  getOpenClawCredential,
  getOpenClawGatewayAgentId,
  getOpenClawGatewayUrl,
  hasUsableOpenClawGateway,
} from "@/lib/openclaw-gateway"

export type ResolvedAiProvider = "openclaw" | "openai" | "groq" | "none"

let cachedOpenClawHealth: { checkedAt: number; healthy: boolean } | null = null

export function hasConfiguredAiProvider(): boolean {
  return getConfiguredPrimaryAiProvider() !== "none"
}

export async function probeOpenClawGateway(timeoutMs = 1500, maxAgeMs = 60_000): Promise<boolean> {
  const credential = getOpenClawCredential()
  const gatewayUrl = getOpenClawGatewayUrl()
  const gatewayAgentId = getOpenClawGatewayAgentId()
  if (!credential || !gatewayUrl) return false

  const now = Date.now()
  if (cachedOpenClawHealth && now - cachedOpenClawHealth.checkedAt < maxAgeMs) {
    return cachedOpenClawHealth.healthy
  }

  try {
    const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential}`,
        "Content-Type": "application/json",
        ...(gatewayAgentId ? { "x-openclaw-agent-id": gatewayAgentId } : {}),
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
  const openClawConfigured = hasUsableOpenClawGateway()
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
