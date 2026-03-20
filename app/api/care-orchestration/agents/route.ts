import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { CARE_AGENTS, buildAgentPlan } from "@/lib/agent-mesh"
import { createAuditLog } from "@/lib/onboarding/audit-service"
import { recordCareEvent } from "@/lib/care-orchestration"

function getIp(request: NextRequest): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })

  await createAuditLog({
    action: "care_orchestration.agents_listed",
    entityType: "CareOrchestration",
    actorId: typeof token?.id === "string" ? token.id : undefined,
    actorEmail: typeof token?.email === "string" ? token.email : undefined,
    description: "Listed available care orchestration agents",
    ipAddress: getIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  })

  recordCareEvent("care_orchestration.agents_listed", {
    actorId: typeof token?.id === "string" ? token.id : undefined,
  })

  return NextResponse.json({
    success: true,
    agents: CARE_AGENTS,
  })
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  const body = await request.json().catch(() => ({}))
  const intake = typeof body?.intake === "string" ? body.intake : ""

  if (!intake) {
    return NextResponse.json({ success: false, error: "intake is required" }, { status: 400 })
  }

  const plan = buildAgentPlan(intake)

  await createAuditLog({
    action: "care_orchestration.plan_created",
    entityType: "CareOrchestration",
    actorId: typeof token?.id === "string" ? token.id : undefined,
    actorEmail: typeof token?.email === "string" ? token.email : undefined,
    description: "Created care orchestration agent plan",
    metadata: {
      intake,
      taskCount: plan.tasks.length,
      roles: [...new Set(plan.tasks.map((task) => task.role))],
    },
    ipAddress: getIp(request),
    userAgent: request.headers.get("user-agent") || undefined,
  })

  const action = recordCareEvent("care_orchestration.plan_created", {
    intake,
    taskCount: plan.tasks.length,
    actorId: typeof token?.id === "string" ? token.id : undefined,
  })

  return NextResponse.json({
    success: true,
    plan,
    actionId: action.id,
  })
}
