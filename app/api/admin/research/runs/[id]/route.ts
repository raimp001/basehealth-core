import { NextResponse } from "next/server"
import { isAdminSession } from "@/lib/admin-session"
import { hydrateAutoResearchRunFromS3 } from "@/lib/autoresearch/aws"
import { listActiveAutoResearchRunIds } from "@/lib/autoresearch/runner"
import { readAutoResearchRun, saveAutoResearchRun } from "@/lib/autoresearch/store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  const { id } = await context.params
  const run = await readAutoResearchRun(id)
  if (!run) {
    return NextResponse.json({ success: false, error: "Run not found" }, { status: 404 })
  }

  const hydrated = await hydrateAutoResearchRunFromS3(run)
  if (hydrated !== run) {
    await saveAutoResearchRun(hydrated)
  }

  return NextResponse.json({
    success: true,
    run: hydrated,
    active: listActiveAutoResearchRunIds().includes(id),
  })
}
