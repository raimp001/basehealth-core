export type AutoResearchProvider = "openclaw" | "openai" | "groq" | "none"
export type AutoResearchRuntime = "local" | "remote"
export type AutoResearchProviderPreference = "openclaw-first" | "openai-first" | "groq-first"
export type AutoResearchExecutionTarget = "local" | "aws-sqs"
export type AutoResearchCodeChangeMode = "report-only" | "patch-artifacts"
export type AutoResearchRunStatus = "queued" | "running" | "completed" | "failed"
export type AutoResearchIterationStatus = "completed" | "failed"

export interface AutoResearchSettings {
  providerPreference: AutoResearchProviderPreference
  executionTarget: AutoResearchExecutionTarget
  codeChangeMode: AutoResearchCodeChangeMode
  maxIterations: number
  maxPatchFiles: number
  evaluationCommand?: string
}

export interface AutoResearchProposedChange {
  file: string
  change: string
  rationale: string
}

export interface AutoResearchDiagnostics {
  gitStatus: string
  gitDiffStat: string
  evaluationCommand?: string
  evaluationOutput?: string
  evaluationExitCode?: number | null
}

export interface AutoResearchIteration {
  index: number
  status: AutoResearchIterationStatus
  startedAt: string
  finishedAt?: string
  provider: AutoResearchProvider
  model?: string | null
  observations: string[]
  hypotheses: string[]
  recommendedExperiments: string[]
  proposedChanges: AutoResearchProposedChange[]
  operatorSummary: string
  diagnostics: AutoResearchDiagnostics
  error?: string
}

export interface AutoResearchAwsConfig {
  region: string | null
  sqsQueueUrl: string | null
  s3Bucket: string | null
  s3Prefix: string
  ecsCluster: string | null
  ecsService: string | null
  ecsTaskDefinition: string | null
  cloudWatchLogGroup: string | null
  credentialsConfigured: boolean
  credentialSource: "env" | "role" | null
  configured: boolean
}

export interface AutoResearchDispatchInfo {
  target: AutoResearchExecutionTarget
  status: "queued" | "processing" | "completed" | "failed"
  queuedAt: string
  messageId?: string
  requestKey?: string
  runKey?: string
  reportKey?: string
  patchKey?: string
  workerLogGroup?: string | null
  lastSyncedAt?: string
}

export interface AutoResearchPatchArtifact {
  path: string
  preview: string
  fileCount: number
  generatedAt: string
  applyEnabled: boolean
  appliedAt?: string
  applyOutput?: string
  s3Key?: string
}

export interface AutoResearchRun {
  id: string
  goal: string
  status: AutoResearchRunStatus
  createdAt: string
  startedAt?: string
  finishedAt?: string
  settings: AutoResearchSettings
  providerResolved?: AutoResearchProvider
  modelResolved?: string | null
  workspaceSummary?: string
  iterations: AutoResearchIteration[]
  dispatch?: AutoResearchDispatchInfo
  patchArtifact?: AutoResearchPatchArtifact
  reportPath?: string
  reportMarkdown?: string
  error?: string
}

export interface AutoResearchRunSummary {
  id: string
  goal: string
  status: AutoResearchRunStatus
  createdAt: string
  startedAt?: string
  finishedAt?: string
  providerResolved?: AutoResearchProvider
  modelResolved?: string | null
  dispatchTarget?: AutoResearchExecutionTarget
  patchAvailable?: boolean
  iterationCount: number
  error?: string
}

export interface AutoResearchConfig {
  runtime: AutoResearchRuntime
  localWorkerEnabled: boolean
  stateDir: string
  workspaceDir: string
  openclawGatewayUrl: string
  openclawConfigured: boolean
  openaiConfigured: boolean
  groqConfigured: boolean
  autoApplyEnabled: boolean
  aws: AutoResearchAwsConfig
}
