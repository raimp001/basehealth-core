import "server-only"

function normalizeGatewayUrl(url: string): string {
  return url.trim().replace(/\/$/, "").replace(/\/v1$/, "")
}

export function getOpenClawCredential(): string {
  return (
    process.env.OPENCLAW_API_KEY ||
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.OPENCLAW_GATEWAY_PASSWORD ||
    ""
  ).trim()
}

export function getOpenClawGatewayAgentId(): string {
  return (process.env.OPENCLAW_GATEWAY_AGENT_ID || "main").trim()
}

export function getOpenClawGatewayUrl(): string {
  const explicitUrl = normalizeGatewayUrl(process.env.OPENCLAW_GATEWAY_URL || "")
  if (explicitUrl) return explicitUrl

  // OpenClaw defaults to a loopback gateway. That works only when the app and
  // gateway run on the same machine, not on remote runtimes such as Vercel.
  const isRemoteRuntime = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
  if (isRemoteRuntime) return ""

  const localPort = (process.env.OPENCLAW_GATEWAY_PORT || "18789").trim()
  return normalizeGatewayUrl(`http://127.0.0.1:${localPort}`)
}

export function hasUsableOpenClawGateway(): boolean {
  return Boolean(getOpenClawCredential() && getOpenClawGatewayUrl())
}

export function getOpenClawConfigurationIssue(): "missing_credential" | "missing_url" | null {
  const credential = getOpenClawCredential()
  const url = getOpenClawGatewayUrl()

  if (!credential) return "missing_credential"
  if (!url) return "missing_url"
  return null
}

export function getConfiguredPrimaryAiProvider(): "openclaw" | "openai" | "groq" | "none" {
  if (hasUsableOpenClawGateway()) return "openclaw"
  if ((process.env.OPENAI_API_KEY || "").trim()) return "openai"
  if ((process.env.GROQ_API_KEY || "").trim()) return "groq"
  return "none"
}
