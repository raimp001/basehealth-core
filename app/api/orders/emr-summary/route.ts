/**
 * EMR Summary API Route
 * 
 * Production-ready route for pushing clinical summaries to EMR via vendor integration.
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
import { pushClinicalSummary } from "@/lib/integrations/emr"
import type { ClinicalSummaryInput } from "@/lib/integrations/emr"
import { IntegrationError } from "@/lib/integrations/baseClient"

export async function POST(req: NextRequest) {
  try {
    const body: ClinicalSummaryInput = await req.json()

    // Basic validation
    if (!body.patientId || !body.providerId || !body.encounterDate || !body.diagnosis || body.diagnosis.length === 0) {
      return NextResponse.json(
        { error: "patientId, providerId, encounterDate, and diagnosis are required", success: false },
        { status: 400 }
      )
    }

    // Call vendor API
    const result = await pushClinicalSummary(body)

    return NextResponse.json(result)
  } catch (error) {
    logger.error("EMR summary error", error)

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
      { error: "Failed to push clinical summary", success: false },
      { status: 500 }
    )
  }
}

