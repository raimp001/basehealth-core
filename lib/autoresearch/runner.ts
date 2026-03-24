import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { generateObject } from "ai"
import { z } from "zod"
import { enqueueAwsAutoResearchRun, syncAutoResearchRunArtifactsToS3 } from "@/lib/autoresearch/aws"
import { getAutoResearchConfig, isLocalAutoResearchRuntime, normalizeAutoResearchSettings } from "@/lib/autoresearch/config"
import { getAutoResearchProviderCandidates } from "@/lib/autoresearch/provider"
import {
  ensureAutoResearchState,
  listAutoResearchRuns,
  readAutoResearchPatch,
  readAutoResearchProgram,
  readAutoResearchRun,
  readAutoResearchSettings,
  saveAutoResearchRun,
  writeAutoResearchPatch,
  writeAutoResearchReport,
} from "@/lib/autoresearch/store"
import { logger } from "@/lib/logger"
import type {
  AutoResearchDiagnostics,
  AutoResearchIteration,
  AutoResearchProvider,
  AutoResearchRun,
  AutoResearchRunSummary,
  AutoResearchSettings,
} from "@/lib/autoresearch/types"

const execFileAsync = promisify(execFile)
const activeRuns = new Map<string, Promise<void>>()
const EXCLUDED_DIRS = new Set([".clawdbot", ".git", ".next", ".vercel", "coverage", "dist", "node_modules"])
const ALLOWED_PATCH_ROOTS = ["app/", "components/", "docs/", "lib/", "tests/"]
const IMPORTANT_FILES = [
  "package.json",
  "README.md",
  "app/page.tsx",
  "app/chat/page.tsx",
  "app/admin/page.tsx",
  "app/api/chat/route.ts",
  "app/api/base/integration-status/route.ts",
  "lib/agent-service.ts",
  "lib/base-billing.ts",
  "prisma/schema.prisma",
]

const iterationSchema = z.object({
  observations: z.array(z.string().min(1)).min(2).max(6),
  hypotheses: z.array(z.string().min(1)).min(1).max(5),
  recommendedExperiments: z.array(z.string().min(1)).min(1).max(5),
  proposedChanges: z
    .array(
      z.object({
        file: z.string().min(1),
        change: z.string().min(1),
        rationale: z.string().min(1),
      }),
    )
    .max(8),
  operatorSummary: z.string().min(1),
})

const patchArtifactSchema = z.object({
  summary: z.string().min(1),
  files: z
    .array(
      z.object({
        file: z.string().min(1),
        rationale: z.string().min(1),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
})

const AUTO_RESEARCH_SYSTEM_PROMPT = `You are the internal BaseHealth auto-research operator.

You are not a user-facing assistant. You are evaluating the product, codebase shape, and operational readiness.

Rules:
- Base every claim on the provided workspace summary, diagnostics, and prior iterations.
- If information is missing, say so explicitly.
- Recommend bounded, reviewable changes.
- Do not invent files or systems that are not present in the provided context.
- Keep proposed changes specific enough for an engineer to act on.`

const PATCH_GENERATION_SYSTEM_PROMPT = `You are generating controlled patch artifacts for BaseHealth.

Rules:
- Only return full replacement contents for the explicitly provided existing files.
- Keep the scope bounded to the proposed changes from the research iteration.
- Preserve unrelated behavior and style.
- Do not introduce new secrets, env vars, or destructive git operations.
- Do not modify files that were not explicitly provided.`

function truncate(value: string, max = 4000): string {
  const text = value.trim()
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}\n...[truncated]` : text
}

function normalizeRelPath(relPath: string): string | null {
  const normalized = path.posix.normalize(relPath.replace(/\\/g, "/")).replace(/^\.\//, "")
  if (!normalized || normalized.startsWith("../") || normalized === "..") return null
  return normalized
}

function isPatchableFile(relPath: string): boolean {
  return (
    ALLOWED_PATCH_ROOTS.some((prefix) => relPath.startsWith(prefix)) &&
    /\.(ts|tsx|js|jsx|md|json)$/i.test(relPath) &&
    !relPath.endsWith("package-lock.json")
  )
}

async function runCommand(command: string, args: string[], cwd: string, timeout = 15000): Promise<string> {
  try {
    const result = await execFileAsync(command, args, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024,
      env: process.env,
    })
    return truncate(`${result.stdout || ""}${result.stderr || ""}`)
  } catch (error: any) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : ""
    const stderr = typeof error?.stderr === "string" ? error.stderr : ""
    return truncate([stdout, stderr, error?.message || "Command failed"].filter(Boolean).join("\n"))
  }
}

async function runShellCommand(command: string, cwd: string, timeout = 30000): Promise<{ output: string; exitCode: number | null }> {
  try {
    const result = await execFileAsync(process.env.SHELL || "/bin/zsh", ["-lc", command], {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024,
      env: process.env,
    })
    return { output: truncate(`${result.stdout || ""}${result.stderr || ""}`), exitCode: 0 }
  } catch (error: any) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : ""
    const stderr = typeof error?.stderr === "string" ? error.stderr : ""
    return {
      output: truncate([stdout, stderr, error?.message || "Command failed"].filter(Boolean).join("\n")),
      exitCode: typeof error?.code === "number" ? error.code : null,
    }
  }
}

async function walkWorkspace(root: string, current = root, files: string[] = []): Promise<string[]> {
  if (files.length >= 250) return files

  const entries = await readdir(current, { withFileTypes: true })
  for (const entry of entries) {
    if (files.length >= 250) break
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      await walkWorkspace(root, path.join(current, entry.name), files)
      continue
    }
    files.push(path.relative(root, path.join(current, entry.name)).replace(/\\/g, "/"))
  }

  return files
}

function getPriority(relPath: string): number {
  const exact = IMPORTANT_FILES.indexOf(relPath)
  if (exact >= 0) return exact
  if (relPath.startsWith("app/")) return 100
  if (relPath.startsWith("components/")) return 200
  if (relPath.startsWith("lib/")) return 300
  return 400
}

async function readFileExcerpt(workspaceDir: string, relPath: string): Promise<string | null> {
  if (!/\.(ts|tsx|js|jsx|md|json|prisma)$/i.test(relPath)) return null

  try {
    const raw = await readFile(path.join(workspaceDir, relPath), "utf8")
    return truncate(raw, 1200)
  } catch {
    return null
  }
}

async function readFullTextFile(workspaceDir: string, relPath: string): Promise<string | null> {
  try {
    const raw = await readFile(path.join(workspaceDir, relPath), "utf8")
    if (raw.length > 12000) return null
    return raw
  } catch {
    return null
  }
}

async function buildWorkspaceSummary(workspaceDir: string): Promise<string> {
  const files = await walkWorkspace(workspaceDir)
  const prioritized = [...files].sort((a, b) => {
    const diff = getPriority(a) - getPriority(b)
    return diff !== 0 ? diff : a.localeCompare(b)
  })

  const sampleFiles = prioritized.slice(0, 10)
  const sampleSections = await Promise.all(
    sampleFiles.map(async (relPath) => {
      const excerpt = await readFileExcerpt(workspaceDir, relPath)
      if (!excerpt) return `## ${relPath}\n[non-text file or unreadable]`
      return `## ${relPath}\n${excerpt}`
    }),
  )

  return [
    `Workspace: ${workspaceDir}`,
    `Files scanned: ${files.length}`,
    `Representative files: ${sampleFiles.join(", ") || "none"}`,
    sampleSections.join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n")
}

async function collectDiagnostics(workspaceDir: string, evaluationCommand?: string): Promise<AutoResearchDiagnostics> {
  const gitStatus = await runCommand("git", ["status", "--short", "--branch"], workspaceDir)
  const gitDiffStat = await runCommand("git", ["diff", "--stat"], workspaceDir)

  if (!evaluationCommand) {
    return {
      gitStatus,
      gitDiffStat,
    }
  }

  const evaluation = await runShellCommand(evaluationCommand, workspaceDir)
  return {
    gitStatus,
    gitDiffStat,
    evaluationCommand,
    evaluationOutput: evaluation.output,
    evaluationExitCode: evaluation.exitCode,
  }
}

function summarizePreviousIterations(iterations: AutoResearchIteration[]): string {
  if (!iterations.length) return "No previous iterations."
  return iterations
    .map((iteration) => {
      const topObservation = iteration.observations[0] || "none"
      const topHypothesis = iteration.hypotheses[0] || "none"
      return `Iteration ${iteration.index}: ${topObservation} | ${topHypothesis}`
    })
    .join("\n")
}

function buildIterationPrompt(input: {
  goal: string
  program: string
  workspaceSummary: string
  diagnostics: AutoResearchDiagnostics
  priorIterations: AutoResearchIteration[]
  iterationNumber: number
  maxIterations: number
}): string {
  return [
    `Goal:\n${input.goal}`,
    `Program:\n${input.program.trim()}`,
    `Iteration: ${input.iterationNumber} of ${input.maxIterations}`,
    `Prior iterations:\n${summarizePreviousIterations(input.priorIterations)}`,
    `Diagnostics:\n- git status\n${input.diagnostics.gitStatus}\n\n- git diff --stat\n${input.diagnostics.gitDiffStat}`,
    input.diagnostics.evaluationCommand
      ? `Evaluation command: ${input.diagnostics.evaluationCommand}\nExit code: ${input.diagnostics.evaluationExitCode ?? "unknown"}\nOutput:\n${input.diagnostics.evaluationOutput || ""}`
      : "No additional evaluation command was configured.",
    `Workspace summary:\n${input.workspaceSummary}`,
    "Return structured output only. Keep it concrete and actionable for engineers.",
  ].join("\n\n")
}

function buildPatchPrompt(input: {
  goal: string
  program: string
  workspaceSummary: string
  latestIteration: AutoResearchIteration
  targets: Array<{ file: string; rationale: string; content: string }>
}): string {
  return [
    `Goal:\n${input.goal}`,
    `Program:\n${input.program.trim()}`,
    `Latest iteration summary:\n${input.latestIteration.operatorSummary}`,
    `Target files and current contents:\n${input.targets
      .map((target) => `## ${target.file}\nRationale: ${target.rationale}\n\n${target.content}`)
      .join("\n\n")}`,
    `Workspace summary:\n${input.workspaceSummary}`,
    "Return full replacement contents for only those target files.",
  ].join("\n\n")
}

function buildRunReport(run: AutoResearchRun): string {
  const iterationBlocks = run.iterations
    .map((iteration) => {
      const proposed = iteration.proposedChanges.length
        ? iteration.proposedChanges
            .map((item) => `- ${item.file}: ${item.change} (${item.rationale})`)
            .join("\n")
        : "- No file changes proposed"

      return [
        `## Iteration ${iteration.index}`,
        `Status: ${iteration.status}`,
        `Provider: ${iteration.provider}${iteration.model ? ` (${iteration.model})` : ""}`,
        `### Observations\n${iteration.observations.map((value) => `- ${value}`).join("\n")}`,
        `### Hypotheses\n${iteration.hypotheses.map((value) => `- ${value}`).join("\n")}`,
        `### Recommended experiments\n${iteration.recommendedExperiments.map((value) => `- ${value}`).join("\n")}`,
        `### Proposed changes\n${proposed}`,
        `### Operator summary\n${iteration.operatorSummary}`,
      ].join("\n\n")
    })
    .join("\n\n")

  const dispatchBlock = run.dispatch
    ? `## Dispatch\n- Target: ${run.dispatch.target}\n- Status: ${run.dispatch.status}\n- Queued: ${run.dispatch.queuedAt}\n- Request key: ${run.dispatch.requestKey || "none"}\n- Run key: ${run.dispatch.runKey || "none"}`
    : ""

  const patchBlock = run.patchArtifact
    ? `## Patch Artifact\n- Path: ${run.patchArtifact.path}\n- Files: ${run.patchArtifact.fileCount}\n- Generated: ${run.patchArtifact.generatedAt}\n- Applied: ${run.patchArtifact.appliedAt || "no"}`
    : ""

  return [
    `# Auto-Research Report ${run.id}`,
    `Goal: ${run.goal}`,
    `Status: ${run.status}`,
    `Created: ${run.createdAt}`,
    run.startedAt ? `Started: ${run.startedAt}` : "",
    run.finishedAt ? `Finished: ${run.finishedAt}` : "",
    run.error ? `Error: ${run.error}` : "",
    `## Settings\n- Provider preference: ${run.settings.providerPreference}\n- Execution target: ${run.settings.executionTarget}\n- Code change mode: ${run.settings.codeChangeMode}\n- Max iterations: ${run.settings.maxIterations}\n- Max patch files: ${run.settings.maxPatchFiles}\n- Evaluation command: ${run.settings.evaluationCommand || "none"}`,
    dispatchBlock,
    patchBlock,
    iterationBlocks || "No iterations completed.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

async function selectPatchTargets(
  workspaceDir: string,
  proposedChanges: Array<{ file: string; rationale: string }>,
  maxPatchFiles: number,
): Promise<Array<{ file: string; rationale: string; content: string }>> {
  const selected: Array<{ file: string; rationale: string; content: string }> = []
  const seen = new Set<string>()

  for (const change of proposedChanges) {
    const normalized = normalizeRelPath(change.file)
    if (!normalized || seen.has(normalized) || !isPatchableFile(normalized)) continue

    try {
      const fileStat = await stat(path.join(workspaceDir, normalized))
      if (!fileStat.isFile()) continue
    } catch {
      continue
    }

    const content = await readFullTextFile(workspaceDir, normalized)
    if (!content) continue

    selected.push({ file: normalized, rationale: change.rationale, content })
    seen.add(normalized)

    if (selected.length >= maxPatchFiles) break
  }

  return selected
}

async function renderPatchDiff(
  workspaceDir: string,
  generatedFiles: Array<{ file: string; before: string; after: string }>,
): Promise<string | null> {
  if (!generatedFiles.length) return null

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "autoresearch-patch-"))
  const beforeRoot = path.join(tempDir, "before")
  const afterRoot = path.join(tempDir, "after")

  try {
    for (const file of generatedFiles) {
      const beforePath = path.join(beforeRoot, file.file)
      const afterPath = path.join(afterRoot, file.file)
      await mkdir(path.dirname(beforePath), { recursive: true })
      await mkdir(path.dirname(afterPath), { recursive: true })
      await writeFile(beforePath, file.before, { encoding: "utf8", flag: "w" })
      await writeFile(afterPath, file.after, { encoding: "utf8", flag: "w" })
    }

    try {
      const result = await execFileAsync("git", ["diff", "--no-index", "--", beforeRoot, afterRoot], {
        cwd: workspaceDir,
        maxBuffer: 1024 * 1024,
      })
      return (result.stdout || "")
        .replaceAll(`${beforeRoot}${path.sep}`, "a/")
        .replaceAll(`${afterRoot}${path.sep}`, "b/")
        .replaceAll(beforeRoot, "a")
        .replaceAll(afterRoot, "b")
    } catch (error: any) {
      const stdout = typeof error?.stdout === "string" ? error.stdout : ""
      if (!stdout) return null
      return stdout
        .replaceAll(`${beforeRoot}${path.sep}`, "a/")
        .replaceAll(`${afterRoot}${path.sep}`, "b/")
        .replaceAll(beforeRoot, "a")
        .replaceAll(afterRoot, "b")
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function generatePatchArtifact(
  run: AutoResearchRun,
  program: string,
  workspaceSummary: string,
): Promise<{ patchContent: string; fileCount: number } | null> {
  if (run.settings.codeChangeMode !== "patch-artifacts") return null
  if (!run.iterations.length) return null

  const latestIteration = run.iterations[run.iterations.length - 1]
  const workspaceDir = getAutoResearchConfig().workspaceDir
  const targets = await selectPatchTargets(
    workspaceDir,
    latestIteration.proposedChanges.map((item) => ({ file: item.file, rationale: item.rationale })),
    run.settings.maxPatchFiles,
  )

  if (!targets.length) return null

  const prompt = buildPatchPrompt({
    goal: run.goal,
    program,
    workspaceSummary,
    latestIteration,
    targets,
  })

  let output: z.infer<typeof patchArtifactSchema> | null = null
  let lastError: Error | null = null
  for (const candidate of getAutoResearchProviderCandidates(run.settings)) {
    try {
      const result = await generateObject({
        model: candidate.model,
        schema: patchArtifactSchema,
        system: PATCH_GENERATION_SYSTEM_PROMPT,
        prompt,
        temperature: 0.1,
      })
      output = result.object
      break
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn("Auto-research patch generation failed", {
        provider: candidate.provider,
        model: candidate.modelName,
        error: lastError.message,
      })
    }
  }

  if (!output) {
    if (lastError) {
      logger.warn("Auto-research patch generation skipped after provider failures", { error: lastError.message })
    }
    return null
  }

  const generatedFiles = output.files
    .map((file) => {
      const target = targets.find((item) => item.file === normalizeRelPath(file.file))
      if (!target) return null
      return {
        file: target.file,
        before: target.content,
        after: file.content,
      }
    })
    .filter((value): value is { file: string; before: string; after: string } => Boolean(value))

  const patchContent = await renderPatchDiff(workspaceDir, generatedFiles)
  if (!patchContent?.trim()) return null

  return {
    patchContent,
    fileCount: generatedFiles.length,
  }
}

export async function createAutoResearchRunRecord(input: {
  id?: string
  goal: string
  settings: AutoResearchSettings
  dispatch?: AutoResearchRun["dispatch"]
  status?: AutoResearchRun["status"]
}): Promise<AutoResearchRun> {
  const run: AutoResearchRun = {
    id: input.id || randomUUID(),
    goal: input.goal.trim(),
    status: input.status || "queued",
    createdAt: new Date().toISOString(),
    settings: normalizeAutoResearchSettings(input.settings),
    iterations: [],
    dispatch: input.dispatch,
  }
  await saveAutoResearchRun(run)
  return run
}

export async function executePersistedAutoResearchRun(
  runId: string,
  options?: { syncToS3?: boolean },
): Promise<AutoResearchRun> {
  const run = await readAutoResearchRun(runId)
  if (!run) throw new Error(`Auto-research run ${runId} was not found`)

  const config = getAutoResearchConfig()
  const currentRun: AutoResearchRun = {
    ...run,
    status: "running",
    startedAt: new Date().toISOString(),
    error: undefined,
    dispatch: run.dispatch
      ? {
          ...run.dispatch,
          status: run.dispatch.target === "aws-sqs" ? "processing" : run.dispatch.status,
        }
      : run.dispatch,
  }
  await saveAutoResearchRun(currentRun)

  try {
    const program = await readAutoResearchProgram()
    const workspaceSummary = await buildWorkspaceSummary(config.workspaceDir)

    currentRun.workspaceSummary = workspaceSummary
    await saveAutoResearchRun(currentRun)

    for (let index = 1; index <= currentRun.settings.maxIterations; index += 1) {
      const diagnostics = await collectDiagnostics(config.workspaceDir, currentRun.settings.evaluationCommand)
      const candidates = getAutoResearchProviderCandidates(currentRun.settings)
      if (!candidates.length) {
        throw new Error("No AI provider is configured for auto-research. Set OpenClaw, OpenAI, or Groq env vars.")
      }

      const prompt = buildIterationPrompt({
        goal: currentRun.goal,
        program,
        workspaceSummary,
        diagnostics,
        priorIterations: currentRun.iterations,
        iterationNumber: index,
        maxIterations: currentRun.settings.maxIterations,
      })

      let object: z.infer<typeof iterationSchema> | null = null
      let provider: AutoResearchProvider = "none"
      let modelName: string | null = null
      let lastError: Error | null = null

      for (const candidate of candidates) {
        try {
          const result = await generateObject({
            model: candidate.model,
            schema: iterationSchema,
            system: AUTO_RESEARCH_SYSTEM_PROMPT,
            prompt,
            temperature: 0.2,
          })
          object = result.object
          provider = candidate.provider
          modelName = candidate.modelName
          break
        } catch (error: any) {
          lastError = error instanceof Error ? error : new Error(String(error))
          logger.warn("Auto-research provider attempt failed", {
            provider: candidate.provider,
            model: candidate.modelName,
            error: lastError.message,
          })
        }
      }

      if (!object) {
        throw lastError || new Error("Auto-research generation failed")
      }

      const now = new Date().toISOString()
      currentRun.iterations.push({
        index,
        status: "completed",
        startedAt: now,
        finishedAt: now,
        provider,
        model: modelName,
        observations: object.observations,
        hypotheses: object.hypotheses,
        recommendedExperiments: object.recommendedExperiments,
        proposedChanges: object.proposedChanges,
        operatorSummary: object.operatorSummary,
        diagnostics,
      })
      currentRun.providerResolved = provider
      currentRun.modelResolved = modelName
      await saveAutoResearchRun(currentRun)
    }

    const patchResult = await generatePatchArtifact(currentRun, program, workspaceSummary)
    let patchContent: string | null = null
    if (patchResult) {
      patchContent = patchResult.patchContent
      const patchPath = await writeAutoResearchPatch(currentRun.id, patchContent)
      currentRun.patchArtifact = {
        path: patchPath,
        preview: truncate(patchContent, 2400),
        fileCount: patchResult.fileCount,
        generatedAt: new Date().toISOString(),
        applyEnabled: config.autoApplyEnabled && currentRun.dispatch?.target !== "aws-sqs",
      }
    }

    currentRun.status = "completed"
    currentRun.finishedAt = new Date().toISOString()
    currentRun.reportMarkdown = buildRunReport(currentRun)
    currentRun.reportPath = await writeAutoResearchReport(currentRun.id, currentRun.reportMarkdown)

    if (options?.syncToS3 || currentRun.dispatch?.target === "aws-sqs") {
      const artifactKeys = await syncAutoResearchRunArtifactsToS3(currentRun, patchContent)
      currentRun.dispatch = currentRun.dispatch
        ? {
            ...currentRun.dispatch,
            status: "completed",
            runKey: artifactKeys.runKey || currentRun.dispatch.runKey,
            reportKey: artifactKeys.reportKey || currentRun.dispatch.reportKey,
            patchKey: artifactKeys.patchKey || currentRun.dispatch.patchKey,
            lastSyncedAt: new Date().toISOString(),
          }
        : currentRun.dispatch

      if (currentRun.patchArtifact && artifactKeys.patchKey) {
        currentRun.patchArtifact.s3Key = artifactKeys.patchKey
      }
    }

    await saveAutoResearchRun(currentRun)
    return currentRun
  } catch (error: any) {
    currentRun.status = "failed"
    currentRun.finishedAt = new Date().toISOString()
    currentRun.error = error instanceof Error ? error.message : String(error)
    currentRun.reportMarkdown = buildRunReport(currentRun)
    currentRun.reportPath = await writeAutoResearchReport(currentRun.id, currentRun.reportMarkdown)

    if (options?.syncToS3 || currentRun.dispatch?.target === "aws-sqs") {
      const artifactKeys = await syncAutoResearchRunArtifactsToS3(currentRun)
      currentRun.dispatch = currentRun.dispatch
        ? {
            ...currentRun.dispatch,
            status: "failed",
            runKey: artifactKeys.runKey || currentRun.dispatch.runKey,
            reportKey: artifactKeys.reportKey || currentRun.dispatch.reportKey,
            lastSyncedAt: new Date().toISOString(),
          }
        : currentRun.dispatch
    }

    await saveAutoResearchRun(currentRun)
    return currentRun
  }
}

async function queueAwsAutoResearchRun(input: { goal: string; settings: AutoResearchSettings }): Promise<AutoResearchRunSummary> {
  const config = getAutoResearchConfig()
  if (!config.aws.configured) {
    throw new Error("AWS auto-research is not configured. Set AWS_REGION, CLAWDBOT_AWS_SQS_QUEUE_URL, and CLAWDBOT_AWS_S3_BUCKET.")
  }

  const run = await createAutoResearchRunRecord({
    goal: input.goal,
    settings: input.settings,
    dispatch: {
      target: "aws-sqs",
      status: "queued",
      queuedAt: new Date().toISOString(),
      workerLogGroup: config.aws.cloudWatchLogGroup,
    },
  })

  try {
    const queued = await enqueueAwsAutoResearchRun(run)
    run.dispatch = {
      ...run.dispatch!,
      messageId: queued.messageId,
      requestKey: queued.requestKey,
    }
    await saveAutoResearchRun(run)
  } catch (error: any) {
    run.status = "failed"
    run.error = error instanceof Error ? error.message : String(error)
    run.dispatch = run.dispatch
      ? {
          ...run.dispatch,
          status: "failed",
        }
      : run.dispatch
    await saveAutoResearchRun(run)
    throw error
  }

  const runs = await listAutoResearchRuns()
  const summary = runs.find((item) => item.id === run.id)
  if (!summary) {
    throw new Error("Failed to queue auto-research run.")
  }
  return summary
}

export function listActiveAutoResearchRunIds(): string[] {
  return Array.from(activeRuns.keys())
}

export async function startAutoResearchRun(input: {
  goal: string
  settings?: Partial<AutoResearchSettings>
}): Promise<AutoResearchRunSummary> {
  await ensureAutoResearchState()

  const goal = input.goal.trim()
  if (!goal) {
    throw new Error("A goal is required to start an auto-research run.")
  }

  const persistedSettings = await readAutoResearchSettings()
  const nextSettings = normalizeAutoResearchSettings({ ...persistedSettings, ...input.settings })

  if (nextSettings.executionTarget === "aws-sqs") {
    return queueAwsAutoResearchRun({ goal, settings: nextSettings })
  }

  if (!isLocalAutoResearchRuntime()) {
    throw new Error("The local auto-research worker is disabled on remote/Vercel deployments.")
  }

  if (activeRuns.size > 0) {
    throw new Error("Only one auto-research run can execute at a time in local mode.")
  }

  const run = await createAutoResearchRunRecord({
    goal,
    settings: nextSettings,
    dispatch: {
      target: "local",
      status: "queued",
      queuedAt: new Date().toISOString(),
    },
  })

  const promise: Promise<void> = executePersistedAutoResearchRun(run.id, {
    syncToS3: getAutoResearchConfig().aws.configured,
  })
    .then(() => undefined)
    .finally(() => {
      activeRuns.delete(run.id)
    })
  activeRuns.set(run.id, promise)

  const runs = await listAutoResearchRuns()
  const summary = runs.find((item) => item.id === run.id)
  if (!summary) {
    throw new Error("Failed to start auto-research run.")
  }
  return summary
}

export async function applyAutoResearchPatch(runId: string): Promise<AutoResearchRun> {
  const config = getAutoResearchConfig()
  if (!config.autoApplyEnabled) {
    throw new Error("Automatic patch application is disabled. Set CLAWDBOT_ALLOW_AUTO_APPLY=true to enable it.")
  }

  if (!isLocalAutoResearchRuntime()) {
    throw new Error("Automatic patch application is only available on local/self-hosted runtimes.")
  }

  const run = await readAutoResearchRun(runId)
  if (!run) {
    throw new Error("Run not found.")
  }

  if (!run.patchArtifact?.path) {
    throw new Error("This run does not have a patch artifact to apply.")
  }

  const patchContent = await readAutoResearchPatch(runId)
  if (!patchContent) {
    throw new Error("Patch artifact could not be read from disk.")
  }

  let applyOutput = "git apply completed"
  try {
    const result = await execFileAsync("git", ["apply", "--whitespace=nowarn", run.patchArtifact.path], {
      cwd: config.workspaceDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
      env: process.env,
    })
    applyOutput = truncate(`${result.stdout || ""}${result.stderr || ""}`) || applyOutput
  } catch (error: any) {
    const stdout = typeof error?.stdout === "string" ? error.stdout : ""
    const stderr = typeof error?.stderr === "string" ? error.stderr : ""
    const output = truncate([stdout, stderr, error?.message || "git apply failed"].filter(Boolean).join("\n"))
    throw new Error(output || "git apply failed")
  }

  run.patchArtifact = {
    ...run.patchArtifact,
    appliedAt: new Date().toISOString(),
    applyOutput,
    applyEnabled: true,
  }
  await saveAutoResearchRun(run)
  return run
}
