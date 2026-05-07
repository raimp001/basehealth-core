/**
 * Imaging Order API Route
 * 
 * Production-ready route for placing imaging orders via vendor integration.
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
import { createImagingOrder } from "@/lib/integrations/radiology"
import type { ImagingOrderInput } from "@/lib/integrations/radiology"
import { IntegrationError } from "@/lib/integrations/baseClient"

export async function POST(req: NextRequest) {
  try {
    const body: ImagingOrderInput = await req.json()

    // Basic validation
    if (!body.patientId || !body.providerId || !body.studyType || !body.bodyPart) {
      return NextResponse.json(
        { error: "patientId, providerId, studyType, and bodyPart are required", success: false },
        { status: 400 }
      )
    }

    if (!body.priority || !["routine", "urgent", "stat"].includes(body.priority)) {
      return NextResponse.json(
        { error: "priority must be 'routine', 'urgent', or 'stat'", success: false },
        { status: 400 }
      )
    }

    // Call vendor API
    const result = await createImagingOrder(body)

    return NextResponse.json(result)
  } catch (error) {
    logger.error("Imaging order error", error)

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
      { error: "Failed to place imaging order", success: false },
      { status: 500 }
    )
  }
}

