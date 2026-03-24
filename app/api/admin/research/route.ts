import { NextRequest, NextResponse } from "next/server"
import { hydrateAutoResearchRunFromS3 } from "@/lib/autoresearch/aws"
import { getAutoResearchConfig, normalizeAutoResearchSettings } from "@/lib/autoresearch/config"
import { listActiveAutoResearchRunIds } from "@/lib/autoresearch/runner"
import {
  listAutoResearchRuns,
  readAutoResearchProgram,
  readAutoResearchSettings,
  readAutoResearchRun,
  saveAutoResearchRun,
  writeAutoResearchProgram,
  writeAutoResearchSettings,
} from "@/lib/autoresearch/store"
import { isAdminSession } from "@/lib/admin-session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  const [program, settings, runs] = await Promise.all([
    readAutoResearchProgram(),
    readAutoResearchSettings(),
    listAutoResearchRuns(),
  ])

  const hydratedRuns = await Promise.all(
    runs.map(async (summary) => {
      const fullRun = await readAutoResearchRun(summary.id)
      if (!fullRun) return summary
      const hydrated = await hydrateAutoResearchRunFromS3(fullRun)
      if (hydrated !== fullRun) {
        await saveAutoResearchRun(hydrated)
      }
      return {
        ...summary,
        status: hydrated.status,
        providerResolved: hydrated.providerResolved,
        modelResolved: hydrated.modelResolved,
        iterationCount: hydrated.iterations.length,
        error: hydrated.error,
        dispatchTarget: hydrated.dispatch?.target,
        patchAvailable: Boolean(hydrated.patchArtifact?.path),
      }
    }),
  )

  return NextResponse.json({
    success: true,
    config: getAutoResearchConfig(),
    program,
    settings,
    runs: hydratedRuns,
    activeRunIds: listActiveAutoResearchRunIds(),
  })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const nextProgram = typeof body?.program === "string" ? body.program : undefined
  const nextSettings = body?.settings ? normalizeAutoResearchSettings(body.settings) : undefined

  const [program, settings] = await Promise.all([
    nextProgram !== undefined ? writeAutoResearchProgram(nextProgram) : readAutoResearchProgram(),
    nextSettings ? writeAutoResearchSettings(nextSettings) : readAutoResearchSettings(),
  ])

  return NextResponse.json({
    success: true,
    program,
    settings,
  })
}
