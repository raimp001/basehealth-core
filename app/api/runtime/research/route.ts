import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import {
  createAutoResearchJob,
  listAutoResearchJobs,
  type AutoResearchConfig,
} from '@/lib/auto-research-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

function canManage(token: any) {
  const email = typeof token?.email === 'string' ? token.email : ''
  return Boolean(token?.id) || isAdminEmail(email)
}

function ip(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const jobs = listAutoResearchJobs()
  return NextResponse.json({ success: true, jobs })
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<AutoResearchConfig>
  if (!body.name || !body.scope || !body.objective) {
    return NextResponse.json({ success: false, error: 'name, scope, and objective are required' }, { status: 400 })
  }

  try {
    const { job, vmSession } = createAutoResearchJob({
      name: body.name,
      scope: body.scope,
      objective: body.objective,
      patientId: body.patientId,
      companyId: body.companyId,
      cadenceMinutes: body.cadenceMinutes,
      durationHours: body.durationHours,
      sources: Array.isArray(body.sources) ? body.sources.filter((item): item is string => typeof item === 'string') : undefined,
    })

    await createAuditLog({
      action: 'research.job.created',
      entityType: 'ResearchRuntime',
      entityId: job.id,
      actorId: actor(token).id,
      actorEmail: actor(token).email,
      description: `Created ${job.config.scope} auto-research job`,
      metadata: {
        vmSessionId: vmSession.id,
        objective: job.config.objective,
        patientId: job.config.patientId,
        companyId: job.config.companyId,
      },
      ipAddress: ip(request),
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({ success: true, job, vmSession }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create research job' },
      { status: 400 },
    )
  }
}
