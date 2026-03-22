import "server-only"

import { createOpenAI } from "@ai-sdk/openai"
import type { CoreMessage } from "ai"
import { logger } from "@/lib/logger"
import { getOpenClawCredential, getOpenClawGatewayAgentId, getOpenClawGatewayUrl } from "@/lib/openclaw-gateway"
import {
  OPENCLAW_AGENT_CATALOG,
  OPENCLAW_AGENT_IDS,
  normalizeOpenClawAgent,
  type OpenClawAgentId,
  type OpenClawAgentSkillPlaybook,
} from "@/lib/openclaw-agent-catalog"

type AgentDefinition = (typeof OPENCLAW_AGENT_CATALOG)[OpenClawAgentId]

const OPENCLAW_AGENTS = OPENCLAW_AGENT_CATALOG

function scoreMessageForAgent(content: string, agent: OpenClawAgentId): number {
  const lower = content.toLowerCase()
  const keywords = OPENCLAW_AGENTS[agent].keywords
  return keywords.reduce((score, keyword) => (lower.includes(keyword) ? score + 1 : score), 0)
}

export function rankAgentsForMessages(
  messages: Array<{ role?: string; content?: unknown }>,
  requestedAgent?: string | null,
  fallback: OpenClawAgentId = "general-health",
): Array<{ agent: OpenClawAgentId; score: number }> {
  const explicitlySelected = normalizeOpenClawAgent(requestedAgent)
  if (explicitlySelected) {
    return [{ agent: explicitlySelected, score: Number.MAX_SAFE_INTEGER }]
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === "user" && typeof message?.content === "string")

  if (!lastUserMessage || typeof lastUserMessage.content !== "string") {
    return [{ agent: fallback, score: 0 }]
  }

  return OPENCLAW_AGENT_IDS
    .map((agent) => ({ agent, score: scoreMessageForAgent(lastUserMessage.content as string, agent) }))
    .sort((a, b) => b.score - a.score)
}

export function resolveAgent(
  messages: Array<{ role?: string; content?: unknown }>,
  requestedAgent?: string | null,
  fallback: OpenClawAgentId = "general-health",
): OpenClawAgentId {
  const ranking = rankAgentsForMessages(messages, requestedAgent, fallback)
  if (ranking.length === 0) return fallback
  return ranking[0].score > 0 ? ranking[0].agent : fallback
}

export function getAgentDefinition(agent: OpenClawAgentId): AgentDefinition {
  return OPENCLAW_AGENTS[agent]
}

export function isOpenClawConfigured(): boolean {
  return Boolean(getOpenClawCredential() && getOpenClawGatewayUrl())
}

function resolveOpenClawModel(agent: OpenClawAgentId): string {
  return (
    process.env[OPENCLAW_AGENTS[agent].modelEnv] ||
    process.env.OPENCLAW_MODEL ||
    "gpt-4o-mini"
  )
}

function formatSkillPlaybook(skill?: OpenClawAgentSkillPlaybook | null): string {
  if (!skill) return ""

  const section = (title: string, lines: string[], ordered = false) => {
    if (!Array.isArray(lines) || lines.length === 0) return ""
    const body = ordered
      ? lines.map((line, idx) => `${idx + 1}. ${line}`).join("\n")
      : lines.map((line) => `- ${line}`).join("\n")
    return `### ${title}\n${body}`
  }

  const blocks = [
    section("Use Cases", skill.useCases),
    section("Intake (Ask If Missing)", skill.intake),
    section("Workflow", skill.workflow, true),
    section("Output Format", skill.outputFormat),
    section("Quality Checklist", skill.qualityChecklist),
    section("Safety & Privacy", skill.safety),
    section("Troubleshooting", skill.troubleshooting || []),
  ].filter(Boolean)

  if (blocks.length === 0) return ""
  return `\n\n## Skill Playbook\n${blocks.join("\n\n")}`
}

export function getOpenClawModel(agent: OpenClawAgentId) {
  const apiKey = getOpenClawCredential()
  const gatewayUrl = getOpenClawGatewayUrl()
  const gatewayAgentId = getOpenClawGatewayAgentId()
  if (!apiKey || !gatewayUrl) return null

  const openclaw = createOpenAI({
    apiKey,
    baseURL: `${gatewayUrl}/v1`,
    // OpenClaw Gateway uses this header (or a model prefix) to select the active agent.
    // Keeping this set ensures compatibility when using a Gateway token/password.
    headers: gatewayAgentId ? { "x-openclaw-agent-id": gatewayAgentId } : undefined,
  })

  return openclaw(resolveOpenClawModel(agent))
}

function serializeContext(context?: Record<string, unknown> | null): string {
  if (!context) return ""

  try {
    return JSON.stringify(context, null, 2)
  } catch (error) {
    logger.warn("Failed to serialize agent context", error)
    return "{}"
  }
}

export function buildAgentSystemPrompt(
  agent: OpenClawAgentId,
  basePrompt: string,
  context?: Record<string, unknown> | null,
): string {
  const agentDef = OPENCLAW_AGENTS[agent]
  const skillBlock = formatSkillPlaybook(agentDef.skill)
  const contextBlock = context
    ? `\n\nContext you can use when relevant:\n${serializeContext(context)}`
    : ""

  return `${basePrompt}

Active OpenClaw agent: ${agentDef.label}
Agent purpose: ${agentDef.description}
Agent directive: ${agentDef.prompt}${skillBlock}${contextBlock}`
}

type AgentEnhanceOptions = {
  agent?: OpenClawAgentId
  context?: Record<string, unknown> | null
}

const agentKit = {
  enhanceMessages: (messages: CoreMessage[], options?: AgentEnhanceOptions): CoreMessage[] => {
    const enhancedMessages = [...messages]

    if (options?.agent) {
      const agent = OPENCLAW_AGENTS[options.agent]
      enhancedMessages.unshift({
        role: "system",
        content: `Active agent focus: ${agent.label}. ${agent.description}`,
      })
    }

    if (options?.context) {
      enhancedMessages.unshift({
        role: "system",
        content: `Trusted context (do not expose private identifiers unless user asks): ${serializeContext(options.context)}`,
      })
    }

    return enhancedMessages
  },
}

const getWalletContext = async (walletAddress: string) => {
  return {
    walletAddress,
    network: process.env.NODE_ENV === "production" ? "base-mainnet" : "base-sepolia",
    contextSource: "wallet",
    generatedAt: new Date().toISOString(),
  }
}

const getTransactionContext = async (txHash: string) => {
  return {
    txHash,
    explorerUrl: `https://${process.env.NODE_ENV === "production" ? "" : "sepolia."}basescan.org/tx/${txHash}`,
    contextSource: "transaction",
    generatedAt: new Date().toISOString(),
  }
}

const getHealthcarePaymentContext = async (appointmentId: string, walletAddress: string) => {
  return {
    appointmentId,
    walletAddress,
    network: process.env.NODE_ENV === "production" ? "base-mainnet" : "base-sepolia",
    contextSource: "healthcare-payment",
    generatedAt: new Date().toISOString(),
  }
}

export { agentKit, getWalletContext, getTransactionContext, getHealthcarePaymentContext }
