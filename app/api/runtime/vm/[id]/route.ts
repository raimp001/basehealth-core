import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import { getVmSession, stopVmSession, tickVmSession } from '@/lib/autonomous-vm-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

function getIp(request: NextRequest): string | undefined {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const session = getVmSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, session })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const session = await tickVmSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  await createAuditLog({
    action: 'vm.session.ticked',
    entityType: 'AutonomousVM',
    entityId: id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Ticked VM session ${id}`,
    metadata: { runCount: session.runCount, status: session.status },
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({ success: true, session })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const session = stopVmSession(id)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  await createAuditLog({
    action: 'vm.session.stopped',
    entityType: 'AutonomousVM',
    entityId: id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Stopped VM session ${id}`,
    metadata: { runCount: session.runCount },
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({ success: true, session })
}
