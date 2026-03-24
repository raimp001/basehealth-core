import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  DEFAULT_AUTO_RESEARCH_PROGRAM,
  DEFAULT_AUTO_RESEARCH_SETTINGS,
  getAutoResearchStateDir,
  normalizeAutoResearchSettings,
} from "@/lib/autoresearch/config"
import type { AutoResearchRun, AutoResearchRunSummary, AutoResearchSettings } from "@/lib/autoresearch/types"

const PROGRAM_FILE = "program.md"
const SETTINGS_FILE = "settings.json"
const RUNS_DIR = "runs"
const REPORTS_DIR = "reports"
const PATCHES_DIR = "patches"

function getStatePaths() {
  const stateDir = getAutoResearchStateDir()
  return {
    stateDir,
    programPath: path.join(stateDir, PROGRAM_FILE),
    settingsPath: path.join(stateDir, SETTINGS_FILE),
    runsDir: path.join(stateDir, RUNS_DIR),
    reportsDir: path.join(stateDir, REPORTS_DIR),
    patchesDir: path.join(stateDir, PATCHES_DIR),
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath)
    return true
  } catch {
    return false
  }
}

function summarizeRun(run: AutoResearchRun): AutoResearchRunSummary {
  return {
    id: run.id,
    goal: run.goal,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    providerResolved: run.providerResolved,
    modelResolved: run.modelResolved,
    dispatchTarget: run.dispatch?.target,
    patchAvailable: Boolean(run.patchArtifact?.path),
    iterationCount: run.iterations.length,
    error: run.error,
  }
}

export async function ensureAutoResearchState(): Promise<void> {
  const { stateDir, runsDir, reportsDir, patchesDir, programPath, settingsPath } = getStatePaths()

  await mkdir(stateDir, { recursive: true })
  await mkdir(runsDir, { recursive: true })
  await mkdir(reportsDir, { recursive: true })
  await mkdir(patchesDir, { recursive: true })

  if (!(await exists(programPath))) {
    await writeFile(programPath, `${DEFAULT_AUTO_RESEARCH_PROGRAM.trim()}\n`, "utf8")
  }

  if (!(await exists(settingsPath))) {
    await writeFile(settingsPath, `${JSON.stringify(DEFAULT_AUTO_RESEARCH_SETTINGS, null, 2)}\n`, "utf8")
  }
}

export async function readAutoResearchProgram(): Promise<string> {
  await ensureAutoResearchState()
  const { programPath } = getStatePaths()
  return readFile(programPath, "utf8")
}

export async function writeAutoResearchProgram(program: string): Promise<string> {
  await ensureAutoResearchState()
  const { programPath } = getStatePaths()
  const nextValue = (program || "").trim() || DEFAULT_AUTO_RESEARCH_PROGRAM
  const finalProgram = `${nextValue.trim()}\n`
  await writeFile(programPath, finalProgram, "utf8")
  return finalProgram
}

export async function readAutoResearchSettings(): Promise<AutoResearchSettings> {
  await ensureAutoResearchState()
  const { settingsPath } = getStatePaths()

  try {
    const raw = await readFile(settingsPath, "utf8")
    const parsed = JSON.parse(raw)
    return normalizeAutoResearchSettings(parsed)
  } catch {
    return DEFAULT_AUTO_RESEARCH_SETTINGS
  }
}

export async function writeAutoResearchSettings(
  settings: Partial<AutoResearchSettings>,
): Promise<AutoResearchSettings> {
  await ensureAutoResearchState()
  const { settingsPath } = getStatePaths()
  const current = await readAutoResearchSettings()
  const next = normalizeAutoResearchSettings({ ...current, ...settings })
  await writeFile(settingsPath, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  return next
}

export async function saveAutoResearchRun(run: AutoResearchRun): Promise<void> {
  await ensureAutoResearchState()
  const { runsDir } = getStatePaths()
  await writeFile(path.join(runsDir, `${run.id}.json`), `${JSON.stringify(run, null, 2)}\n`, "utf8")
}

export async function readAutoResearchRun(id: string): Promise<AutoResearchRun | null> {
  await ensureAutoResearchState()
  const { runsDir } = getStatePaths()
  try {
    const raw = await readFile(path.join(runsDir, `${id}.json`), "utf8")
    return JSON.parse(raw) as AutoResearchRun
  } catch {
    return null
  }
}

export async function listAutoResearchRuns(): Promise<AutoResearchRunSummary[]> {
  await ensureAutoResearchState()
  const { runsDir } = getStatePaths()

  const files = await readdir(runsDir)
  const runs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const raw = await readFile(path.join(runsDir, file), "utf8")
        return JSON.parse(raw) as AutoResearchRun
      }),
  )

  return runs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(summarizeRun)
}

export async function writeAutoResearchReport(runId: string, markdown: string): Promise<string> {
  await ensureAutoResearchState()
  const { reportsDir } = getStatePaths()
  const reportPath = path.join(reportsDir, `${runId}.md`)
  await writeFile(reportPath, markdown, "utf8")
  return reportPath
}

export async function writeAutoResearchPatch(runId: string, patchContent: string): Promise<string> {
  await ensureAutoResearchState()
  const { patchesDir } = getStatePaths()
  const patchPath = path.join(patchesDir, `${runId}.patch`)
  await writeFile(patchPath, patchContent, "utf8")
  return patchPath
}

export async function readAutoResearchPatch(runId: string): Promise<string | null> {
  await ensureAutoResearchState()
  const { patchesDir } = getStatePaths()

  try {
    return await readFile(path.join(patchesDir, `${runId}.patch`), "utf8")
  } catch {
    return null
  }
}
