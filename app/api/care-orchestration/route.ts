import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { getCareSnapshot, recordCareEvent } from "@/lib/care-orchestration"
import { createAuditLog } from "@/lib/onboarding/audit-service"

function getIp(request: NextRequest): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("patientId")?.trim() || undefined

  const snapshot = await getCareSnapshot(patientId)

  await createAuditLog({
    action: "care_orchestration.snapshot_viewed",
    entityType: "CareOrchestration",
    entityId: patientId,
    actorId: typeof token?.id === "string" ? token.id : undefined,
    actorEmail: typeof token?.email === "string" ? token.email : undefined,
    description: "Viewed care orchestration snapshot",
    metadata: {
      hasPatientId: Boolean(patientId),
      recentActionCount: snapshot.recentActions.length,
    },
    ipAddress: getIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  })

  recordCareEvent("care_orchestration.snapshot_viewed", {
    patientId,
    actorId: typeof token?.id === "string" ? token.id : undefined,
  })

  return NextResponse.json(snapshot)
}
