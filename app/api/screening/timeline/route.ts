import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getCurrentUser } from "@/lib/auth"
import { isDatabaseAvailable } from "@/lib/application-store"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const SCREENING_PLAN_ACTION = "screening.plan_saved"

type RiskLevel = "low" | "moderate" | "elevated" | "unknown"

interface TimelineRecommendation {
  id: string
  name: string
  frequency: string
  grade: string
  primaryProvider: string
}

interface TimelineSummary {
  totalScreenings: number
  gradeACount: number
  gradeBCount: number
  riskLevel: RiskLevel
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function parseStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, max)
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function parseRiskLevel(value: unknown): RiskLevel {
  if (value === "low" || value === "moderate" || value === "elevated") return value
  return "unknown"
}

function parseRecommendations(value: unknown): TimelineRecommendation[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const record = asRecord(item)
      const id = String(record.id || "").trim()
      const name = String(record.name || "").trim()
      if (!id || !name) return null

      return {
        id,
        name,
        frequency: String(record.frequency || "").trim(),
        grade: String(record.grade || "").trim(),
        primaryProvider: String(record.primaryProvider || "").trim(),
      }
    })
    .filter((item): item is TimelineRecommendation => Boolean(item))
    .slice(0, 20)
}

function parseSummary(value: unknown, recommendationsCount: number, riskLevel: RiskLevel): TimelineSummary {
  const record = asRecord(value)
  return {
    totalScreenings: toNumber(record.totalScreenings, recommendationsCount),
    gradeACount: toNumber(record.gradeACount),
    gradeBCount: toNumber(record.gradeBCount),
    riskLevel,
  }
}

function extractTimelineEntry(log: {
  id: string
  createdAt: Date
  metadata: unknown
}) {
  const metadata = asRecord(log.metadata)
  const recommendations = parseRecommendations(metadata.recommendations)
  const riskLevel = parseRiskLevel(metadata.riskLevel)
  const summary = parseSummary(metadata.summary, recommendations.length, riskLevel)

  return {
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    summary,
    recommendations,
    contextIncluded: Boolean(metadata.contextIncluded),
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      return NextResponse.json({
        success: true,
        entries: [],
        note: "Timeline sync unavailable because database is not configured.",
      })
    }

    const limitParam = new URL(request.url).searchParams.get("limit")
    const limit = Math.min(Math.max(toNumber(limitParam, 10), 1), 20)

    const logs = await prisma.auditLog.findMany({
      where: {
        actorId: user.id,
        action: SCREENING_PLAN_ACTION,
        entityType: "ScreeningPlan",
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      entries: logs.map((log) => extractTimelineEntry({ id: log.id, createdAt: log.createdAt, metadata: log.metadata })),
    })
  } catch (error) {
    logger.error("Failed to load screening timeline", error)
    return NextResponse.json({ success: false, error: "Failed to load screening timeline" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      return NextResponse.json(
        { success: false, error: "Timeline sync unavailable because database is not configured." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const recommendations = parseRecommendations(body?.recommendations)

    if (recommendations.length === 0) {
      return NextResponse.json(
        { success: false, error: "Recommendations are required to save a timeline entry." },
        { status: 400 },
      )
    }

    const riskProfile = asRecord(body?.riskProfile)
    const riskLevel = parseRiskLevel(riskProfile.level)
    const summary = parseSummary(body?.summary, recommendations.length, riskLevel)

    const assessmentInput = asRecord(body?.assessmentInput)

    const metadata = {
      version: 1,
      summary,
      riskLevel,
      contextIncluded: Boolean(body?.contextIncluded),
      recommendations,
      assessmentInput: {
        age: toNumber(assessmentInput.age, 0),
        gender: String(assessmentInput.gender || "").toLowerCase(),
        smokingStatus: String(assessmentInput.smokingStatus || ""),
        bmiCategory: String(assessmentInput.bmiCategory || ""),
        medicalHistory: parseStringArray(assessmentInput.medicalHistory),
        familyHistory: parseStringArray(assessmentInput.familyHistory),
      },
    }

    const log = await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email || undefined,
        actorRole: user.role.toUpperCase(),
        action: SCREENING_PLAN_ACTION,
        entityType: "ScreeningPlan",
        entityId: user.patientId || user.id,
        description: "Saved personalized screening plan",
        metadata: metadata as unknown as Prisma.InputJsonValue,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      entry: extractTimelineEntry({ id: log.id, createdAt: log.createdAt, metadata: log.metadata }),
    })
  } catch (error) {
    logger.error("Failed to save screening timeline entry", error)
    return NextResponse.json({ success: false, error: "Failed to save timeline entry" }, { status: 500 })
  }
}
