/**
 * Admin Caregiver Applications API
 * 
 * Manage caregiver applications - list, approve, reject, request more info.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getPrimaryAdminEmail } from "@/lib/admin-access"

// GET - List all caregiver applications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") // DRAFT, SUBMITTED, APPROVED, REJECTED, PENDING_INFO
    const limit = parseInt(searchParams.get("limit") || "50")

    const whereClause: any = {
      role: "CAREGIVER",
    }

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase()
    } else {
      // Default: show submitted applications needing review
      whereClause.status = {
        in: ["SUBMITTED", "PENDING_INFO"],
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { submittedAt: "desc" },
      take: limit,
    })

    // Format for admin display
    const formatted = applications.map((app) => ({
      id: app.id,
      firstName: app.firstName || "",
      lastName: app.lastName || "",
      fullName: app.fullName || `${app.firstName || ""} ${app.lastName || ""}`.trim(),
      email: app.email,
      phone: app.phone || "",
      status: app.status.toLowerCase(),
      submittedAt: app.submittedAt?.toISOString() || app.createdAt.toISOString(),
      reviewedAt: app.reviewedAt?.toISOString() || null,
      reviewedBy: app.reviewedBy || null,
      reviewNotes: app.reviewNotes || "",
      // Professional info
      specialty: app.specialty || (app.servicesOffered as string[])?.[0] || "General Care",
      servicesOffered: app.servicesOffered || [],
      experienceYears: app.experienceYears || "N/A",
      certifications: app.certifications || [],
      languages: app.languages || ["English"],
      // Location
      regions: app.regions || [],
      // Attestations
      attestedAccuracy: app.attestedAccuracy || false,
      consentToBackgroundCheck: app.consentToBackgroundCheck || false,
    }))

    return NextResponse.json({
      success: true,
      applications: formatted,
      total: formatted.length,
    })
  } catch (error) {
    logger.error("Failed to fetch caregiver applications", { error })
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    )
  }
}

// PATCH - Update application status or request more info
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { applicationId, action, reviewNotes } = body
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.basehealth.xyz"

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "Application ID and action are required" },
        { status: 400 }
      )
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      )
    }

    let newStatus: string
    let emailSubject: string
    let emailBody: string

    switch (action) {
      case "approve":
        newStatus = "APPROVED"
        emailSubject = "Your BaseHealth Caregiver Application Has Been Approved!"
        emailBody = `
          <p>Congratulations! Your application to join BaseHealth as a caregiver has been approved.</p>
          <p>You can now log in to your account and start accepting care requests.</p>
          <p><a href="${appUrl}/login">Log in to BaseHealth</a></p>
        `
        break

      case "reject":
        newStatus = "REJECTED"
        emailSubject = "Update on Your BaseHealth Caregiver Application"
        emailBody = `
          <p>Thank you for your interest in joining BaseHealth as a caregiver.</p>
          <p>After careful review, we are unable to approve your application at this time.</p>
          ${reviewNotes ? `<p><strong>Notes:</strong> ${reviewNotes}</p>` : ""}
          <p>If you have questions, please contact us at support@basehealth.xyz</p>
        `
        break

      case "request_info":
        newStatus = "PENDING_INFO"
        emailSubject = "Additional Information Needed for Your BaseHealth Application"
        emailBody = `
          <p>Thank you for applying to join BaseHealth as a caregiver.</p>
          <p>We need some additional information to complete your application review:</p>
          <p><strong>${reviewNotes || "Please provide any missing documentation or information."}</strong></p>
          <p>Please reply to this email or log in to your application to provide the requested information.</p>
          <p><a href="${appUrl}/onboarding?role=caregiver">Update Your Application</a></p>
        `
        break

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: approve, reject, or request_info" },
          { status: 400 }
        )
    }

    // Update application
    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: newStatus as any,
        reviewedAt: new Date(),
        reviewedBy: getPrimaryAdminEmail(),
        reviewNotes: reviewNotes || null,
      },
    })

    // Send email notification
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey && application.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "BaseHealth <notifications@basehealth.xyz>",
            to: application.email,
            subject: emailSubject,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 20px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">BaseHealth</h1>
                </div>
                <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
                  <p>Hi ${application.firstName || "there"},</p>
                  ${emailBody}
                  <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
                    This is an automated message from BaseHealth.
                  </p>
                </div>
              </div>
            `,
          }),
        })
        logger.info("Sent email notification to applicant", { email: application.email, action })
      } catch (emailError) {
        logger.error("Failed to send email notification", { error: emailError })
      }
    }

    // If approved, create the Caregiver record
    if (action === "approve") {
      try {
        await prisma.caregiver.create({
          data: {
            applicationId: applicationId,
            firstName: application.firstName || "",
            lastName: application.lastName || "",
            email: application.email,
            phone: application.phone,
            specialties: (application.servicesOffered as string[]) || [],
            yearsExperience: application.experienceYears?.toString() || "N/A",
            certifications: (application.certifications as string[]) || [],
            languagesSpoken: (application.languages as string[]) || ["English"],
            serviceAreas: (application.regions as string[]) || [],
            location: ((application.regions as string[]) || [])[0] || "",
            bio: application.bio,
            status: "APPROVED" as any,
            verified: true,
            isBackgroundChecked: application.consentToBackgroundCheck || false,
          },
        })
        logger.info("Created Caregiver record for approved application", { applicationId })
      } catch (createError) {
        logger.error("Failed to create Caregiver record", { error: createError })
      }
    }

    return NextResponse.json({
      success: true,
      application: updated,
      action,
      emailSent: !!resendApiKey,
    })
  } catch (error) {
    logger.error("Failed to update caregiver application", { error })
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    )
  }
}
