import { NextResponse } from "next/server"
import { isAdminSession } from "@/lib/admin-session"
import { applyAutoResearchPatch } from "@/lib/autoresearch/runner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const run = await applyAutoResearchPatch(id)
    return NextResponse.json({
      success: true,
      run,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
