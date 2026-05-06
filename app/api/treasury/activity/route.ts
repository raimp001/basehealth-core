import { NextResponse } from "next/server"
import { getTreasuryActivity } from "@/lib/treasury/activity"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20

  try {
    const activity = await getTreasuryActivity(limit)
    return NextResponse.json(activity, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to load treasury activity",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    )
  }
}
