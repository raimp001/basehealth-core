import "server-only"

import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import type { PatientProfile } from "@/lib/guideline-engine"

type RecommendationSource = {
  title: string
  organization: string
  url: string
  publishedDate?: string
  lastReviewed?: string
  version?: string
  gradeRationale?: string
}

type ScreeningRecommendationForReview = {
  id: string
  name: string
  description: string
  frequency: string
  grade: string
  primaryProvider: string
  adjustedFrequency?: string
  pathwayApplied?: string
  pathwayNote?: string
  sources?: RecommendationSource[]
}

type ClinicalReviewFlagForReview = {
  id: string
  title: string
  why: string
  nextStep: string
}

type HighRiskPathwayForReview = {
  id: string
  name: string
  description: string
  referrals: string[]
  source: string
}

export type ClinicianReviewRequest = {
  profile: PatientProfile
  recommendations: ScreeningRecommendationForReview[]
  clinicalReviewFlags: ClinicalReviewFlagForReview[]
  personalizationNotes?: string[]
  highRiskPathways?: HighRiskPathwayForReview[]
}

const clinicianReviewObjectSchema = z.object({
  summary: z.string(),
  recommendationConfidence: z.enum(["rules-confirmed", "needs-clinician-review", "insufficient-context"]),
  reviewRequired: z.boolean(),
  clinicalReasoning: z.array(
    z.object({
      finding: z.string(),
      recommendationIds: z.array(z.string()),
      rationale: z.string(),
      evidenceBasis: z.enum(["provided-guideline", "patient-context", "clinical-judgment-needed"]),
    }),
  ),
  clinicianActions: z.array(
    z.object({
      title: z.string(),
      rationale: z.string(),
      urgency: z.enum(["routine", "soon", "urgent"]),
      owner: z.enum(["patient", "primary-care", "specialist", "care-team"]),
    }),
  ),
  missingInformation: z.array(z.string()),
  patientFriendlyNote: z.string(),
  safetyEscalation: z.string().nullable(),
})

export type ClinicianReviewObject = z.infer<typeof clinicianReviewObjectSchema>

export type ClinicianReviewResult =
  | {
      enabled: true
      status: "generated"
      provider: "openai"
      model: string
      generatedAt: string
      reviewRequired: boolean
      review: ClinicianReviewObject
    }
  | {
      enabled: false
      status: "not_configured" | "error"
      provider: "openai"
      model: string | null
      generatedAt: string
      reviewRequired: boolean
      error: string
    }

export function isClinicianOpenAiConfigured(): boolean {
  if ((process.env.DISABLE_OPENAI_CLINICIAN_REVIEW || "").toLowerCase() === "true") return false
  return Boolean((process.env.OPENAI_API_KEY || "").trim())
}

export function getClinicianOpenAiModel(): string {
  return process.env.OPENAI_CLINICIAN_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini"
}

export function getClinicianReviewTimeoutMs(): number {
  const raw = Number.parseInt(process.env.OPENAI_CLINICIAN_TIMEOUT_MS || "12000", 10)
  return Number.isFinite(raw) && raw >= 1000 ? raw : 12000
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`OpenAI clinician review timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function compactString(value: unknown, maxLength = 1200): string {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

function safeList(values: unknown[] | undefined, maxItems = 12): string[] {
  if (!Array.isArray(values)) return []
  return values.map((value) => compactString(value, 120)).filter(Boolean).slice(0, maxItems)
}

export function buildClinicianReviewPromptInput(input: ClinicianReviewRequest): string {
  const recommendations = input.recommendations.slice(0, 20).map((recommendation) => ({
    id: recommendation.id,
    name: recommendation.name,
    grade: recommendation.grade,
    frequency: recommendation.frequency,
    adjustedFrequency: recommendation.adjustedFrequency || null,
    pathwayApplied: recommendation.pathwayApplied || null,
    primaryProvider: recommendation.primaryProvider,
    description: compactString(recommendation.description, 300),
    sources: (recommendation.sources || []).slice(0, 3).map((source) => ({
      title: source.title,
      organization: source.organization,
      publishedDate: source.publishedDate || null,
      lastReviewed: source.lastReviewed || null,
      version: source.version || null,
      gradeRationale: source.gradeRationale ? compactString(source.gradeRationale, 320) : null,
    })),
  }))

  return JSON.stringify(
    {
      patientProfile: {
        age: input.profile.age,
        gender: input.profile.gender,
        smokingStatus: input.profile.smokingStatus,
        bmiCategory: input.profile.bmiCategory,
        isPregnant: input.profile.isPregnant,
        sexuallyActive: input.profile.sexuallyActive,
        familyHistory: safeList(input.profile.familyHistory),
        medicalHistory: safeList(input.profile.medicalHistory),
        additionalContext: compactString(input.profile.additionalContext, 1200),
      },
      recommendations,
      clinicalReviewFlags: input.clinicalReviewFlags.slice(0, 12),
      personalizationNotes: safeList(input.personalizationNotes, 10),
      highRiskPathways: (input.highRiskPathways || []).slice(0, 8).map((pathway) => ({
        id: pathway.id,
        name: pathway.name,
        description: compactString(pathway.description, 320),
        referrals: safeList(pathway.referrals, 6),
        source: compactString(pathway.source, 240),
      })),
    },
    null,
    2,
  )
}

const CLINICIAN_REVIEW_SYSTEM_PROMPT = `
You are BaseHealth's clinician-facing preventive-care review assistant.

Your role:
- Review the structured patient profile, guideline-derived recommendations, sources, high-risk pathway matches, and clinical review flags.
- Help a licensed clinician understand what is clinically appropriate to confirm, personalize, or escalate.
- Use only the provided guideline/source metadata and patient context. Do not invent citations, diagnoses, lab values, medication doses, or facts not present.

Safety rules:
- This is clinical decision support, not autonomous medical care.
- Do not replace clinician judgment. If context suggests high-risk disease, abnormal results, pregnancy, immunocompromise, hereditary cancer risk, urgent symptoms, or unclear details, require clinician review.
- Do not recommend prescription medication initiation, medication dosing, or treatment plans beyond advising clinician review.
- If symptoms could be urgent or severe, return an urgent safetyEscalation.
- Keep patient-facing text plain, calm, and non-alarming.
- Keep output compact: summary under 120 words, no more than 6 clinicianActions, no more than 8 clinicalReasoning items, and no more than 8 missingInformation items.
`

export async function generateClinicianRecommendationReview(
  input: ClinicianReviewRequest,
): Promise<ClinicianReviewResult> {
  const modelName = getClinicianOpenAiModel()
  const generatedAt = new Date().toISOString()

  if (!isClinicianOpenAiConfigured()) {
    return {
      enabled: false,
      status: "not_configured",
      provider: "openai",
      model: null,
      generatedAt,
      reviewRequired: input.clinicalReviewFlags.length > 0 || Boolean(input.highRiskPathways?.length),
      error: "OPENAI_API_KEY is not configured for clinician recommendation review.",
    }
  }

  try {
    const result = await withTimeout(
      generateObject({
        model: openai(modelName),
        schema: clinicianReviewObjectSchema,
        system: CLINICIAN_REVIEW_SYSTEM_PROMPT,
        prompt: `Return a clinician support review for this BaseHealth screening assessment:\n\n${buildClinicianReviewPromptInput(input)}`,
        temperature: 0.1,
        maxTokens: 1400,
      }),
      getClinicianReviewTimeoutMs(),
    )

    return {
      enabled: true,
      status: "generated",
      provider: "openai",
      model: modelName,
      generatedAt,
      reviewRequired: result.object.reviewRequired,
      review: result.object,
    }
  } catch (error) {
    return {
      enabled: false,
      status: "error",
      provider: "openai",
      model: modelName,
      generatedAt,
      reviewRequired: input.clinicalReviewFlags.length > 0 || Boolean(input.highRiskPathways?.length),
      error: error instanceof Error ? error.message : "OpenAI clinician review failed.",
    }
  }
}
