import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import {
  createMonetizationOpportunity,
  listMonetizationOpportunities,
  type MonetizationOpportunityInput,
} from '@/lib/monetization-opportunity-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const opportunities = listMonetizationOpportunities()
  return NextResponse.json({ success: true, opportunities })
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as Partial<MonetizationOpportunityInput>

  if (!body.title || !body.summary || !body.domain || !Array.isArray(body.monetizationPaths) || body.monetizationPaths.length === 0) {
    return NextResponse.json(
      { success: false, error: 'title, summary, domain, and monetizationPaths are required' },
      { status: 400 },
    )
  }

  const opportunity = createMonetizationOpportunity({
    title: body.title,
    summary: body.summary,
    domain: body.domain,
    expectedValue: Number(body.expectedValue || 5),
    executionDifficulty: Number(body.executionDifficulty || 5),
    capitalRequired: Number(body.capitalRequired || 5),
    timeHorizonMonths: Number(body.timeHorizonMonths || 12),
    asymmetryScore: Number(body.asymmetryScore || 5),
    monetizationPaths: body.monetizationPaths.filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
  })

  await createAuditLog({
    action: 'monetization.opportunity.created',
    entityType: 'MonetizationOpportunity',
    entityId: opportunity.id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Created monetization opportunity ${opportunity.title}`,
    metadata: {
      domain: opportunity.domain,
      priorityScore: opportunity.priorityScore,
      monetizationPaths: opportunity.monetizationPaths,
    },
  })

  return NextResponse.json({ success: true, opportunity }, { status: 201 })
}
