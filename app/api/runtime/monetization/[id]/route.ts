import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getRuntimeActor, isRuntimeAdmin } from '@/lib/runtime-access'
import {
  getMonetizationOpportunity,
  updateMonetizationOpportunityStatus,
  type MonetizationOpportunityStatus,
} from '@/lib/monetization-opportunity-layer'
import { createAuditLog } from '@/lib/onboarding/audit-service'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const opportunity = getMonetizationOpportunity(id)
  if (!opportunity) {
    return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, opportunity })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  if (!isRuntimeAdmin(token)) {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const status = typeof body?.status === 'string' ? (body.status as MonetizationOpportunityStatus) : ''
  if (!['new', 'accepted', 'rejected', 'watching'].includes(status)) {
    return NextResponse.json({ success: false, error: 'Valid status is required' }, { status: 400 })
  }

  const { id } = await params
  const opportunity = updateMonetizationOpportunityStatus(id, status)
  if (!opportunity) {
    return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 })
  }

  await createAuditLog({
    action: 'monetization.opportunity.updated',
    entityType: 'MonetizationOpportunity',
    entityId: id,
    actorId: getRuntimeActor(token).id,
    actorEmail: getRuntimeActor(token).email,
    description: `Updated monetization opportunity ${id}`,
    metadata: { status },
  })

  return NextResponse.json({ success: true, opportunity })
}
