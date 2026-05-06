import { NextResponse } from "next/server"
import { getAutoResearchConfig } from "@/lib/autoresearch/config"
import { ACTIVE_CHAIN, PAYMENT_CONFIG } from "@/lib/network-config"
import { getPrimaryAdminEmail } from "@/lib/admin-access"
import { probeOpenClawGateway } from "@/lib/ai-provider"
import {
  getConfiguredPrimaryAiProvider,
  getOpenClawConfigurationIssue,
  getOpenClawCredential,
  getOpenClawGatewayAgentId,
  getOpenClawGatewayUrl,
} from "@/lib/openclaw-gateway"
import {
  getClinicianOpenAiModel,
  isClinicianOpenAiConfigured,
} from "@/lib/clinical/openai-clinician-review"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Check = {
  id: string
  label: string
  env?: string
  required: boolean
  passed: boolean
  help: string
}

type Section = {
  id: string
  title: string
  checks: Check[]
}

function sectionReady(section: Section): boolean {
  return section.checks.every((check) => (check.required ? check.passed : true))
}

export async function GET() {
  const autoResearchConfig = getAutoResearchConfig()
  const chatPaywallEnabled = (process.env.BASEHEALTH_CHAT_PAYWALL || "false").toLowerCase() === "true"

  const openclawKey = getOpenClawCredential()
  const openclawGatewayAgentId = getOpenClawGatewayAgentId()
  const openclawGatewayUrl = getOpenClawGatewayUrl()
  const openclawConfigurationIssue = getOpenClawConfigurationIssue()
  const openclawGatewayReachable = openclawKey && openclawGatewayUrl ? await probeOpenClawGateway(2500, 0) : null
  const aiProvider = getConfiguredPrimaryAiProvider()

  const sections: Section[] = [
    {
      id: "sign-in",
      title: "Wallet Sign-In (Base Smart Wallet)",
      checks: [
        {
          id: "nextauth-secret",
          label: "NextAuth secret set",
          env: "NEXTAUTH_SECRET",
          required: true,
          passed: Boolean(process.env.NEXTAUTH_SECRET),
          help: "Required for secure session signing.",
        },
        {
          id: "database-url",
          label: "Database URL set",
          env: "DATABASE_URL",
          required: true,
          passed: Boolean(process.env.DATABASE_URL),
          help: "Required to persist users and wallet recognition.",
        },
        {
          id: "app-url",
          label: "App URL configured (recommended)",
          env: "NEXT_PUBLIC_APP_URL",
          required: false,
          passed: Boolean(process.env.NEXT_PUBLIC_APP_URL),
          help: "Recommended for correct metadata, receipts, and deep-links (e.g., Base mini app).",
        },
      ],
    },
    {
      id: "miniapp",
      title: "Base Mini App Ownership (farcaster.json)",
      checks: [
        {
          id: "miniapp-header",
          label: "Account association header set",
          env: "MINIAPP_HEADER / FARCASTER_HEADER",
          required: true,
          passed: Boolean(process.env.MINIAPP_HEADER || process.env.FARCASTER_HEADER),
          help: "Required for Base mini app ownership verification (served from /.well-known/farcaster.json).",
        },
        {
          id: "miniapp-payload",
          label: "Account association payload set",
          env: "MINIAPP_PAYLOAD / FARCASTER_PAYLOAD",
          required: true,
          passed: Boolean(process.env.MINIAPP_PAYLOAD || process.env.FARCASTER_PAYLOAD),
          help: "Required for Base mini app ownership verification (served from /.well-known/farcaster.json).",
        },
        {
          id: "miniapp-signature",
          label: "Account association signature set",
          env: "MINIAPP_SIGNATURE / FARCASTER_SIGNATURE",
          required: true,
          passed: Boolean(process.env.MINIAPP_SIGNATURE || process.env.FARCASTER_SIGNATURE),
          help: "Required for Base mini app ownership verification (served from /.well-known/farcaster.json).",
        },
        {
          id: "miniapp-app-url",
          label: "App URL configured (recommended)",
          env: "NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_URL",
          required: false,
          passed: Boolean(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL),
          help: "Recommended so farcaster.json homeUrl/iconUrl and open-graph metadata match your canonical domain.",
        },
      ],
    },
    {
      id: "assistant",
      title: "Assistant (AI)",
      checks: [
        {
          id: "ai-provider",
          label: "AI provider configured",
          required: true,
          passed: aiProvider !== "none",
          help:
            "Required for /chat. Use OpenClaw only when the gateway itself is reachable from this deployment. Otherwise configure OPENAI_API_KEY or GROQ_API_KEY as fallback.",
        },
        {
          id: "openclaw",
          label: "OpenClaw key configured (recommended)",
          env: "OPENCLAW_API_KEY / OPENCLAW_GATEWAY_TOKEN / OPENCLAW_GATEWAY_PASSWORD",
          required: false,
          passed: Boolean(openclawKey),
          help: "Enables multi-agent routing with provider-managed models (supports OPENCLAW_API_KEY or OPENCLAW_GATEWAY_TOKEN or OPENCLAW_GATEWAY_PASSWORD).",
        },
        {
          id: "openclaw-url",
          label: "OpenClaw gateway URL configured for this runtime",
          env: "OPENCLAW_GATEWAY_URL",
          required: false,
          passed: !openclawKey || Boolean(openclawGatewayUrl),
          help:
            "Remote deployments such as Vercel need an explicit OPENCLAW_GATEWAY_URL that points to your reachable gateway or tunnel. A token alone is not enough because OpenClaw gateways are usually self-hosted.",
        },
        {
          id: "openclaw-reachable",
          label: "OpenClaw gateway reachable",
          env: "OPENCLAW_GATEWAY_URL + (OPENCLAW_API_KEY | OPENCLAW_GATEWAY_TOKEN | OPENCLAW_GATEWAY_PASSWORD)",
          required: false,
          passed: openclawKey && openclawGatewayUrl ? Boolean(openclawGatewayReachable) : true,
          help:
            openclawConfigurationIssue === "missing_url"
              ? "OpenClaw is not reachable here because OPENCLAW_GATEWAY_URL is missing. Point it at the actual HTTPS gateway or tunnel exposed from the OpenClaw host."
              : "Diagnostic check only. If using OpenClaw, gateway reachability can fail temporarily; chat should still be allowed when an AI provider key is configured.",
        },
        {
          id: "openai",
          label: "OpenAI key configured (optional fallback)",
          env: "OPENAI_API_KEY",
          required: false,
          passed: Boolean(process.env.OPENAI_API_KEY),
          help: "Fallback provider if OpenClaw is not configured.",
        },
      ],
    },
    {
      id: "clinical-openai",
      title: "Clinician Recommendation Support",
      checks: [
        {
          id: "openai-clinician-key",
          label: "OpenAI clinician review configured",
          env: "OPENAI_API_KEY",
          required: false,
          passed: isClinicianOpenAiConfigured(),
          help:
            "Enables structured clinician support review for screening recommendations. Keep this clinician-facing and require human review for high-risk cases.",
        },
        {
          id: "openai-clinician-model",
          label: "OpenAI clinician model selected",
          env: "OPENAI_CLINICIAN_MODEL / OPENAI_MODEL",
          required: false,
          passed: Boolean(getClinicianOpenAiModel()),
          help: `Current model: ${getClinicianOpenAiModel()}. Set OPENAI_CLINICIAN_MODEL to override the screening review model.`,
        },
      ],
    },
    {
      id: "account-management",
      title: "Account Management",
      checks: [
        {
          id: "wallet-signin",
          label: "Wallet sign-in routes available",
          required: true,
          passed: true,
          help: "Uses Base Smart Wallet / Coinbase Smart Wallet message signing (EOA + EIP-1271 contract wallets).",
        },
      ],
    },
    {
      id: "billing",
      title: "Billing & Receipts",
      checks: [
        {
          id: "resend-key",
          label: "Resend API key configured",
          env: "RESEND_API_KEY",
          required: false,
          passed: Boolean(process.env.RESEND_API_KEY),
          help: "Needed for email delivery of receipts and refund notifications.",
        },
        {
          id: "from-email",
          label: "From email configured",
          env: "FROM_EMAIL",
          required: false,
          passed: Boolean(process.env.FROM_EMAIL),
          help: "Recommended sender identity for billing communications.",
        },
      ],
    },
    {
      id: "payments",
      title: "Base Payments",
      checks: [
        {
          id: "recipient",
          label: "Base settlement recipient wallet configured",
          env: "NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS",
          required: true,
          passed: /^0x[a-fA-F0-9]{40}$/.test((PAYMENT_CONFIG.recipientAddress || "").trim()),
          help: "The wallet that receives USDC/ETH settlement. Set NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS to override.",
        },
        {
          id: "walletconnect",
          label: "WalletConnect project ID configured (optional)",
          env: "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
          required: false,
          passed: Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
          help: "Optional. Coinbase Smart Wallet works without it; WalletConnect adds broader wallet compatibility.",
        },
      ],
    },
    {
      id: "privy",
      title: "Privy (Optional)",
      checks: [
        {
          id: "privy-app-id",
          label: "Privy App ID configured (optional)",
          env: "NEXT_PUBLIC_PRIVY_APP_ID",
          required: false,
          passed: Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
          help: "Enables Privy-powered UX (e.g., x402 helper components) if you want it.",
        },
        {
          id: "privy-secret",
          label: "Privy App Secret configured (optional)",
          env: "PRIVY_APP_SECRET",
          required: false,
          passed: Boolean(process.env.PRIVY_APP_SECRET),
          help: "Only needed if you use Privy server-side token verification routes.",
        },
      ],
    },
    {
      id: "refunds",
      title: "Refund Operations",
      checks: [
        {
          id: "admin-email",
          label: "Admin notification routing enabled",
          env: "PRIMARY_ADMIN_EMAIL",
          required: false,
          passed: Boolean(getPrimaryAdminEmail()),
          help: "Application and operations notifications route to the primary admin mailbox.",
        },
        {
          id: "attestation-key",
          label: "Attestation private key configured",
          env: "ATTESTATION_PRIVATE_KEY",
          required: false,
          passed: Boolean(process.env.ATTESTATION_PRIVATE_KEY),
          help: "Optional for advanced onchain audit trails and attestations.",
        },
      ],
    },
    {
      id: "autoresearch",
      title: "Auto-Research Worker",
      checks: [
        {
          id: "local-runtime",
          label: "Local worker runtime available",
          env: "CLAWDBOT_STATE_DIR / CLAWDBOT_WORKSPACE_DIR",
          required: false,
          passed: autoResearchConfig.localWorkerEnabled,
          help: "The v1 research loop runs only on local/self-hosted Node runtimes, not Vercel serverless.",
        },
        {
          id: "research-provider",
          label: "Research AI provider configured",
          env: "OPENCLAW_* / OPENAI_API_KEY / GROQ_API_KEY",
          required: false,
          passed:
            autoResearchConfig.openclawConfigured ||
            autoResearchConfig.openaiConfigured ||
            autoResearchConfig.groqConfigured,
          help: "At least one provider is needed to execute local research runs and generate reports.",
        },
        {
          id: "research-aws",
          label: "AWS worker path configured",
          env: "AWS_REGION + CLAWDBOT_AWS_SQS_QUEUE_URL + CLAWDBOT_AWS_S3_BUCKET",
          required: false,
          passed: autoResearchConfig.aws.configured,
          help: "Optional for queue-based execution through SQS, S3, and an ECS/Fargate worker.",
        },
        {
          id: "research-auto-apply",
          label: "Patch auto-apply explicitly enabled",
          env: "CLAWDBOT_ALLOW_AUTO_APPLY",
          required: false,
          passed: autoResearchConfig.autoApplyEnabled,
          help: "Optional. Patch artifacts are still reviewable without this, but applying them from the UI stays disabled.",
        },
      ],
    },
  ]

  const missingRequired = sections.flatMap((section) =>
    section.checks
      .filter((check) => check.required && !check.passed)
      .map((check) => ({
        sectionId: section.id,
        sectionTitle: section.title,
        checkId: check.id,
        label: check.label,
        env: check.env,
        help: check.help,
      })),
  )

  const readiness = sections.map((section) => ({
    id: section.id,
    title: section.title,
    ready: sectionReady(section),
    checks: section.checks,
  }))

  const response = NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
      vercelUrl: process.env.VERCEL_URL || null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    },
    features: {
      chatPaywallEnabled,
    },
    autoresearch: {
      runtime: autoResearchConfig.runtime,
      localWorkerEnabled: autoResearchConfig.localWorkerEnabled,
      autoApplyEnabled: autoResearchConfig.autoApplyEnabled,
      aiProviderConfigured:
        autoResearchConfig.openclawConfigured ||
        autoResearchConfig.openaiConfigured ||
        autoResearchConfig.groqConfigured,
      aws: autoResearchConfig.aws,
    },
    network: {
      name: ACTIVE_CHAIN.name,
      chainId: ACTIVE_CHAIN.id,
    },
    overallReady: missingRequired.length === 0,
    aiProvider,
    clinicianReview: {
      configured: isClinicianOpenAiConfigured(),
      provider: "openai",
      model: getClinicianOpenAiModel(),
    },
    openclaw: {
      gatewayUrlConfigured: Boolean(openclawGatewayUrl),
      gatewayUrlHost: openclawGatewayUrl ? new URL(openclawGatewayUrl).host : null,
      gatewayAgentId: openclawGatewayAgentId || null,
      configurationIssue: openclawConfigurationIssue,
      reachable: openclawKey && openclawGatewayUrl ? Boolean(openclawGatewayReachable) : null,
    },
    sections: readiness,
    missingRequired,
  })
  response.headers.set("Cache-Control", "no-store, max-age=0")
  return response
}
