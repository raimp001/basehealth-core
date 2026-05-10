import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import { completeAutoResearchJob, getAutoResearchJob, pauseAutoResearchJob } from '@/lib/auto-research-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

function canManage(token: any) {
  const email = typeof token?.email === 'string' ? token.email : ''
  return Boolean(token?.id) || isAdminEmail(email)
}

function ip(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const job = getAutoResearchJob(id)
  if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })

  return NextResponse.json({ success: true, job })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = typeof body?.action === 'string' ? body.action : ''

  let job = null
  if (action === 'pause') job = pauseAutoResearchJob(id)
  if (action === 'complete') {
    job = completeAutoResearchJob(id, typeof body?.note === 'string' ? body.note : undefined)
  }

  if (!job) {
    return NextResponse.json({ success: false, error: 'Invalid action or job not found' }, { status: 400 })
  }

  await createAuditLog({
    action: `research.job.${action}`,
    entityType: 'ResearchRuntime',
    entityId: id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Updated research job with action: ${action}`,
    metadata: { action, status: job.status },
    ipAddress: ip(request),
    userAgent: request.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({ success: true, job })
}
