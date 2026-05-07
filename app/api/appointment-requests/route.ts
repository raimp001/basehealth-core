import { NextResponse } from "next/server"
import { z } from "zod"

import { logger } from "@/lib/logger"
import { getClientIdentifier, rateLimit } from "@/lib/rate-limiter"

/**
 * Appointment-request endpoint.
 *
 * Lightweight, request-only flow: a patient submits a structured visit
 * request and we acknowledge it. No PHI is stored in the database from this
 * endpoint — clients persist a local mirror in localStorage so the patient
 * can see their requests on /appointments.
 *
 * The request body is validated and the metadata (urgency, source, provider
 * kind, no PHI) is logged so on-call can prioritize urgent requests. Upgrade
 * path: write to a HIPAA-compliant `AppointmentRequest` table once we have a
 * BAA-covered storage layer.
 */

const RequestSchema = z.object({
  id: z.string().min(6).max(80),
  providerName: z.string().min(1).max(160),
  providerKind: z.string().min(1).max(80),
  specialty: z.string().max(120).optional().nullable(),
  reason: z.string().min(1).max(1000),
  urgency: z.enum(["routine", "soon", "urgent"]),
  preferredWindow: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().max(160),
  contactPhone: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  npi: z.string().max(40).optional().nullable(),
  fullAddress: z.string().max(300).optional().nullable(),
  createdAt: z.number().int().positive().optional(),
})

export async function POST(req: Request) {
  const clientId = getClientIdentifier(req)
  const rate = rateLimit(`${clientId}:appointment-request`, {
    windowMs: 60_000,
    maxRequests: 10,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    )
  }

  let parsed: z.infer<typeof RequestSchema>
  try {
    const body = await req.json()
    parsed = RequestSchema.parse(body)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    )
  }

  // Log only non-PHI metadata. Never log reason/notes verbatim.
  logger.info("appointment.request.received", {
    requestId: parsed.id,
    providerKind: parsed.providerKind,
    urgency: parsed.urgency,
    hasSpecialty: Boolean(parsed.specialty),
    hasNpi: Boolean(parsed.npi),
    hasNotes: Boolean(parsed.notes),
  })

  return NextResponse.json(
    {
      ok: true,
      requestId: parsed.id,
      status: "received",
      receivedAt: new Date().toISOString(),
      nextStep:
        parsed.urgency === "urgent"
          ? "If symptoms are severe or worsening, seek emergency care immediately."
          : "We will reach out to confirm a time. You can also pay a copay on Base in advance.",
    },
    { status: 202 },
  )
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      info:
        "Use POST with a JSON body matching the visit-request schema. Requests are mirrored client-side at /appointments.",
    },
    { status: 200 },
  )
}
