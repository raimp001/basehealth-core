/**
 * Provider Attestation Verification API
 * 
 * Public endpoint to verify a provider's on-chain attestation.
 * Patients can use this to verify a provider is legitimately verified.
 * 
 * GET /api/providers/[id]/attestation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyProviderAttestation, getAttestationUrl } from '@/lib/eas-attestation-service'
import { ACTIVE_CHAIN } from '@/lib/network-config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id
    
    // Get provider
    const provider = await prisma.caregiver.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialties: true,
        verified: true,
        bio: true,
      },
    })
    
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: 'Provider not found',
      }, { status: 404 })
    }
    
    // Extract attestation UID from bio if present
    const attestationMatch = provider.bio?.match(/\[Attestation: (0x[a-fA-F0-9]+)\]/)
    const attestationUid = attestationMatch?.[1]
    
    if (!attestationUid) {
      return NextResponse.json({
        success: true,
        provider: {
          id: provider.id,
          name: `${provider.firstName} ${provider.lastName}`.trim(),
          specialty: provider.specialties?.[0] ?? null,
          verified: provider.verified,
        },
        attestation: {
          exists: false,
          message: 'No on-chain attestation found for this provider',
        },
      })
    }
    
    // Verify attestation on-chain
    const verification = await verifyProviderAttestation(attestationUid)
    
    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        name: `${provider.firstName} ${provider.lastName}`.trim(),
        specialty: provider.specialties?.[0] ?? null,
        verified: provider.verified,
      },
      attestation: {
        exists: true,
        valid: verification.valid,
        uid: attestationUid,
        explorerUrl: getAttestationUrl(attestationUid),
        network: ACTIVE_CHAIN.name,
        details: verification.attestation,
        error: verification.error,
      },
    })
    
  } catch (error) {
    console.error('Attestation verification error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, { status: 500 })
  }
}
