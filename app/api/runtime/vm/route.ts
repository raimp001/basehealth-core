import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import {
  listVmSessions,
  runVmSchedulerTick,
  startVmSession,
  type VmGoal,
} from '@/lib/autonomous-vm-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

function getIp(request: NextRequest): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const result = await runVmSchedulerTick()
  const sessions = listVmSessions()

  await createAuditLog({
    action: 'vm.scheduler.status',
    entityType: 'AutonomousVM',
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: 'Read VM scheduler status',
    metadata: { processed: result.processed, active: result.active, sessions: sessions.length },
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({ success: true, ...result })
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const goals = Array.isArray(body?.goals) ? (body.goals as VmGoal[]) : []

  if (!name) {
    return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
  }
  if (goals.length === 0) {
    return NextResponse.json({ success: false, error: 'goals must contain at least one action' }, { status: 400 })
  }

  const validGoals = goals
    .map((goal) => ({ type: typeof goal?.type === 'string' ? goal.type.trim() : '', payload: goal?.payload }))
    .filter((goal) => goal.type.length > 0)

  if (validGoals.length === 0) {
    return NextResponse.json({ success: false, error: 'goals require non-empty type fields' }, { status: 400 })
  }

  const session = startVmSession({
    name,
    goals: validGoals,
    durationHours: typeof body?.durationHours === 'number' ? body.durationHours : undefined,
    intervalSeconds: typeof body?.intervalSeconds === 'number' ? body.intervalSeconds : undefined,
  })

  await createAuditLog({
    action: 'vm.session.started',
    entityType: 'AutonomousVM',
    entityId: session.id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Started VM session ${session.name}`,
    metadata: {
      durationHours: body?.durationHours,
      intervalSeconds: body?.intervalSeconds,
      goals: validGoals.map((goal) => goal.type),
    },
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({ success: true, session }, { status: 201 })
}
