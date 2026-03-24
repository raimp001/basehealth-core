import "server-only"

import path from "node:path"
import type {
  AutoResearchAwsConfig,
  AutoResearchConfig,
  AutoResearchProviderPreference,
  AutoResearchSettings,
} from "@/lib/autoresearch/types"

const REMOTE_STATE_DIR = "/tmp/basehealth-clawdbot"

export const DEFAULT_AUTO_RESEARCH_PROGRAM = `# BaseHealth Auto-Research Program

You are operating as an internal operator-supervised research worker for BaseHealth.

Objectives:
- Find the highest-value reliability, UX, care-ops, billing, and agent-system improvements.
- Prefer concrete, testable changes over broad visions.
- Explain what should change before any code is changed.

Rules:
- Do not claim that changes were made unless they were actually made.
- Do not suggest unsafe medical behavior.
- Do not expose secrets, PHI, or private tokens.
- Treat this as an internal research loop, not a user-facing chat response.
- The v1 worker does not write code automatically; it proposes bounded changes for operator review.

Output priorities:
1. Observations grounded in the repo/workspace state.
2. Hypotheses about the highest-leverage improvements.
3. Recommended experiments or checks.
4. Proposed file-level changes with rationale.
5. A concise operator summary.`

export const DEFAULT_AUTO_RESEARCH_SETTINGS: AutoResearchSettings = {
  providerPreference: "openclaw-first",
  executionTarget: "local",
  codeChangeMode: "report-only",
  maxIterations: 2,
  maxPatchFiles: 2,
  evaluationCommand: "",
}

export function getAutoResearchAwsConfig(): AutoResearchAwsConfig {
  const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim() || null
  const sqsQueueUrl = (process.env.CLAWDBOT_AWS_SQS_QUEUE_URL || "").trim() || null
  const s3Bucket = (process.env.CLAWDBOT_AWS_S3_BUCKET || "").trim() || null
  const s3Prefix = (process.env.CLAWDBOT_AWS_S3_PREFIX || "autoresearch").trim().replace(/^\/+|\/+$/g, "") || "autoresearch"
  const ecsCluster = (process.env.CLAWDBOT_AWS_ECS_CLUSTER || "").trim() || null
  const ecsService = (process.env.CLAWDBOT_AWS_ECS_SERVICE || "").trim() || null
  const ecsTaskDefinition = (process.env.CLAWDBOT_AWS_ECS_TASK_DEFINITION || "").trim() || null
  const cloudWatchLogGroup = (process.env.CLAWDBOT_AWS_CLOUDWATCH_LOG_GROUP || "").trim() || null

  return {
    region,
    sqsQueueUrl,
    s3Bucket,
    s3Prefix,
    ecsCluster,
    ecsService,
    ecsTaskDefinition,
    cloudWatchLogGroup,
    configured: Boolean(region && sqsQueueUrl && s3Bucket),
  }
}

export function getAutoResearchRuntime(): "local" | "remote" {
  return process.env.VERCEL || process.env.VERCEL_ENV ? "remote" : "local"
}

export function isLocalAutoResearchRuntime(): boolean {
  return getAutoResearchRuntime() === "local"
}

export function getAutoResearchStateDir(): string {
  const configured = process.env.CLAWDBOT_STATE_DIR?.trim()
  if (configured) return path.resolve(configured)
  if (getAutoResearchRuntime() === "remote") return REMOTE_STATE_DIR
  return path.join(process.cwd(), ".clawdbot")
}

export function getAutoResearchWorkspaceDir(): string {
  const configured = process.env.CLAWDBOT_WORKSPACE_DIR?.trim()
  if (configured) return path.resolve(configured)
  return process.cwd()
}

export function normalizeAutoResearchSettings(
  input?: Partial<AutoResearchSettings> | null,
): AutoResearchSettings {
  const providerPreference =
    input?.providerPreference === "openai-first" || input?.providerPreference === "groq-first"
      ? input.providerPreference
      : DEFAULT_AUTO_RESEARCH_SETTINGS.providerPreference

  const executionTarget = input?.executionTarget === "aws-sqs" ? "aws-sqs" : DEFAULT_AUTO_RESEARCH_SETTINGS.executionTarget
  const codeChangeMode =
    input?.codeChangeMode === "patch-artifacts" ? "patch-artifacts" : DEFAULT_AUTO_RESEARCH_SETTINGS.codeChangeMode

  const maxIterationsCandidate = Number(input?.maxIterations)
  const maxIterations = Number.isFinite(maxIterationsCandidate)
    ? Math.min(5, Math.max(1, Math.round(maxIterationsCandidate)))
    : DEFAULT_AUTO_RESEARCH_SETTINGS.maxIterations

  const maxPatchFilesCandidate = Number(input?.maxPatchFiles)
  const maxPatchFiles = Number.isFinite(maxPatchFilesCandidate)
    ? Math.min(3, Math.max(1, Math.round(maxPatchFilesCandidate)))
    : DEFAULT_AUTO_RESEARCH_SETTINGS.maxPatchFiles

  return {
    providerPreference,
    executionTarget,
    codeChangeMode,
    maxIterations,
    maxPatchFiles,
    evaluationCommand: typeof input?.evaluationCommand === "string" ? input.evaluationCommand.trim() : "",
  }
}

export function getAutoResearchConfig(): AutoResearchConfig {
  const aws = getAutoResearchAwsConfig()
  const openclawGatewayUrl = (process.env.OPENCLAW_GATEWAY_URL || "https://gateway.openclaw.ai")
    .trim()
    .replace(/\/$/, "")
    .replace(/\/v1$/, "")

  return {
    runtime: getAutoResearchRuntime(),
    localWorkerEnabled: isLocalAutoResearchRuntime(),
    stateDir: getAutoResearchStateDir(),
    workspaceDir: getAutoResearchWorkspaceDir(),
    openclawGatewayUrl,
    openclawConfigured: Boolean(
      process.env.OPENCLAW_API_KEY || process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_PASSWORD,
    ),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    autoApplyEnabled: (process.env.CLAWDBOT_ALLOW_AUTO_APPLY || "false").toLowerCase() === "true",
    aws,
  }
}

export function getProviderOrder(preference: AutoResearchProviderPreference): Array<"openclaw" | "openai" | "groq"> {
  switch (preference) {
    case "openai-first":
      return ["openai", "openclaw", "groq"]
    case "groq-first":
      return ["groq", "openclaw", "openai"]
    default:
      return ["openclaw", "openai", "groq"]
  }
}
