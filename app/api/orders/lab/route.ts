/**
 * Lab Order API Route
 * 
 * Production-ready route for placing lab orders via vendor integration.
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
import { createLabOrder } from "@/lib/integrations/labs"
import type { LabOrderInput } from "@/lib/integrations/labs"
import { IntegrationError } from "@/lib/integrations/baseClient"

export async function POST(req: NextRequest) {
  try {
    const body: LabOrderInput = await req.json()

    // Basic validation
    if (!body.patientId || !body.providerId || !body.testCodes || body.testCodes.length === 0) {
      return NextResponse.json(
        { error: "patientId, providerId, and testCodes are required", success: false },
        { status: 400 }
      )
    }

    if (!body.testNames || body.testNames.length !== body.testCodes.length) {
      return NextResponse.json(
        { error: "testNames array must match testCodes array length", success: false },
        { status: 400 }
      )
    }

    // Call vendor API
    const result = await createLabOrder(body)

    return NextResponse.json(result)
  } catch (error) {
    logger.error("Lab order error", error)

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
      { error: "Failed to place lab order", success: false },
      { status: 500 }
    )
  }
}

