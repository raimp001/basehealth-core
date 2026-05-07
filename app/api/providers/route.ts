import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { findAvailableProviders } from "@/services/provider-service"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const specialty = searchParams.get("specialty") || undefined
    const isAvailableNow = searchParams.get("available") === "true"
    const maxDistance = searchParams.get("distance") ? Number.parseInt(searchParams.get("distance")!) : undefined

    const latitude = searchParams.get("lat") ? Number.parseFloat(searchParams.get("lat")!) : undefined
    const longitude = searchParams.get("lng") ? Number.parseFloat(searchParams.get("lng")!) : undefined

    const providers = await findAvailableProviders(specialty, isAvailableNow, maxDistance, latitude, longitude)

    return NextResponse.json({ providers })
  } catch (error) {
    logger.error("Error fetching providers", error)
    return NextResponse.json({ error: "Failed to fetch providers" }, { status: 500 })
  }
}
