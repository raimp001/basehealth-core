import { NextResponse } from "next/server"
import { getPendingProviderVerifications, updateProviderVerificationStatus } from "@/lib/provider-service"
import { logger } from "@/lib/logger"
import { verifyProviderCredentials, getVerificationStatus } from "@/lib/oig-sam-verification"
import { createProviderAttestation, getAttestationUrl } from "@/lib/eas-attestation-service"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    // In a real app, we would check admin authentication here
    const pendingProviders = await getPendingProviderVerifications()
    return NextResponse.json({ providers: pendingProviders })
  } catch (error) {
    logger.error("Error fetching pending verifications", error)
    return NextResponse.json({ error: "An error occurred while fetching pending verifications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // In a real app, we would check admin authentication here
    const { providerId, status, skipVerification } = await request.json()

    if (!providerId || !status) {
      return NextResponse.json({ error: "Provider ID and status are required" }, { status: 400 })
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 })
    }

    // If approving, run OIG/SAM verification first
    let oigSamResult = null
    let attestationResult = null
    
    if (status === "approved") {
      // Get provider details
      const providerDetails = await prisma.caregiver.findUnique({
        where: { id: providerId },
        include: { user: true },
      })
      
      if (!providerDetails) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 })
      }
      
      // Run OIG/SAM verification unless explicitly skipped
      const fullName = `${providerDetails.firstName ?? ''} ${providerDetails.lastName ?? ''}`.trim()
      if (!skipVerification) {
        oigSamResult = await verifyProviderCredentials(
          providerDetails.licenseNumber || '', // Using license as NPI for now
          providerDetails.firstName ?? '',
          providerDetails.lastName ?? '',
          fullName || undefined
        )
        
        const verificationStatus = getVerificationStatus(oigSamResult)
        
        // If excluded, reject automatically
        if (verificationStatus.status === 'EXCLUDED') {
          const rejectedProvider = await updateProviderVerificationStatus(providerId, "rejected")
          
          // Store exclusion reason
          if (providerDetails.id) {
            await prisma.caregiver.update({
              where: { id: providerId },
              data: {
                bio: `EXCLUDED: ${verificationStatus.message}. ${providerDetails.bio || ''}`,
              },
            })
          }
          
          return NextResponse.json({
            provider: rejectedProvider,
            verification: {
              status: 'EXCLUDED',
              message: verificationStatus.message,
              details: verificationStatus.details,
              oigSamResult,
            },
            autoRejected: true,
          })
        }
        
        // Log if needs review
        if (verificationStatus.status === 'NEEDS_REVIEW') {
          logger.warn('Provider verification needs manual review', {
            providerId,
            message: verificationStatus.message,
            details: verificationStatus.details,
          })
        }
      }
      
      // Update provider status
      const provider = await updateProviderVerificationStatus(providerId, status as "approved" | "rejected")
      
      if (!provider) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 })
      }
      
      // Create on-chain attestation
      const providerAddress = providerDetails.user?.email 
        ? `0x${Buffer.from(providerDetails.user.email).toString('hex').slice(0, 40).padEnd(40, '0')}`
        : '0x0000000000000000000000000000000000000000'
      
      attestationResult = await createProviderAttestation(
        providerAddress,
        {
          npi: providerDetails.licenseNumber || '',
          name: fullName,
          specialty: providerDetails.specialties?.[0] || '',
          npiVerified: true,
          oigCleared: oigSamResult?.overallClear ?? true,
          samCleared: oigSamResult?.samCheck?.debarred === false,
          licenseVerified: true,
          verificationDate: Math.floor(Date.now() / 1000),
        }
      )
      
      // Store attestation UID if successful
      if (attestationResult.success && attestationResult.uid) {
        await prisma.caregiver.update({
          where: { id: providerId },
          data: {
            // Store attestation UID in available field
            bio: `${providerDetails.bio || ''}\n[Attestation: ${attestationResult.uid}]`,
          },
        })
        
        logger.info('Provider attestation created', {
          providerId,
          attestationUid: attestationResult.uid,
          explorerUrl: getAttestationUrl(attestationResult.uid),
        })
      }
      
      return NextResponse.json({
        provider,
        verification: oigSamResult ? {
          status: getVerificationStatus(oigSamResult).status,
          message: getVerificationStatus(oigSamResult).message,
          verificationId: oigSamResult.verificationId,
        } : null,
        attestation: attestationResult ? {
          success: attestationResult.success,
          uid: attestationResult.uid,
          explorerUrl: attestationResult.uid ? getAttestationUrl(attestationResult.uid) : null,
          error: attestationResult.error,
        } : null,
      })
    }

    // For rejection, just update status
    const provider = await updateProviderVerificationStatus(providerId, status as "approved" | "rejected")

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    }

    return NextResponse.json({ provider })
  } catch (error) {
    logger.error("Error updating provider verification", error)
    return NextResponse.json({ error: "An error occurred while updating provider verification" }, { status: 500 })
  }
}
