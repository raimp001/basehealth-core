import { NextRequest, NextResponse } from "next/server"
import { isAdminSession } from "@/lib/admin-session"
import { hydrateAutoResearchRunFromS3 } from "@/lib/autoresearch/aws"
import { listActiveAutoResearchRunIds, startAutoResearchRun } from "@/lib/autoresearch/runner"
import { listAutoResearchRuns, readAutoResearchRun, saveAutoResearchRun } from "@/lib/autoresearch/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  const runs = await listAutoResearchRuns()
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
    runs: hydratedRuns,
    activeRunIds: listActiveAutoResearchRunIds(),
  })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const goal = typeof body?.goal === "string" ? body.goal.trim() : ""

  if (!goal) {
    return NextResponse.json({ success: false, error: "Goal is required" }, { status: 400 })
  }

  try {
    const run = await startAutoResearchRun({
      goal,
      settings: body?.settings,
    })

    return NextResponse.json({
      success: true,
      run,
      detail: await readAutoResearchRun(run.id),
      activeRunIds: listActiveAutoResearchRunIds(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
