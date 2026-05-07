/**
 * Prescription Order API Route
 * 
 * Production-ready route for sending e-prescriptions via vendor integration.
 * 
 * HIPAA COMPLIANCE NOTES:
 * - This route calls a HIPAA-compliant integration vendor with a BAA
 * - PHI is only sent from this secured backend environment, never from the browser
 * - API keys are stored in environment variables, never hard-coded
 * 
 * Environment variables required:
 * - HEALTH_INTEGRATION_BASE_URL
 * - HEALTH_INTEGRATION_API_KEY
 */

import { logger } from "@/lib/logger"
import { NextRequest, NextResponse } from "next/server"
import { sendPrescription } from "@/lib/integrations/pharmacy"
import type { PrescriptionInput } from "@/lib/integrations/pharmacy"
import { IntegrationError } from "@/lib/integrations/baseClient"

export async function POST(req: NextRequest) {
  try {
    const body: PrescriptionInput = await req.json()

    // Basic validation
    if (!body.patientId || !body.providerId || !body.medication || !body.dosage || !body.frequency) {
      return NextResponse.json(
        { error: "patientId, providerId, medication, dosage, and frequency are required", success: false },
        { status: 400 }
      )
    }

    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: "quantity must be greater than 0", success: false },
        { status: 400 }
      )
    }

    if (!body.daysSupply || body.daysSupply <= 0) {
      return NextResponse.json(
        { error: "daysSupply must be greater than 0", success: false },
        { status: 400 }
      )
    }

    // Call vendor API
    const result = await sendPrescription(body)

    return NextResponse.json(result)
  } catch (error) {
    logger.error("Prescription error", error)

    if (error instanceof IntegrationError) {
      return NextResponse.json(
        {
          error: "Vendor API error",
          message: error.message,
          statusCode: error.statusCode,
          success: false,
        },
        { status: error.statusCode > 0 ? error.statusCode : 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to send prescription", success: false },
      { status: 500 }
    )
  }
}

