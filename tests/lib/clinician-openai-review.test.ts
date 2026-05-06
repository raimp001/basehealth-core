import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildClinicianReviewPromptInput,
  getClinicianOpenAiModel,
  getClinicianReviewTimeoutMs,
  isClinicianOpenAiConfigured,
} from "@/lib/clinical/openai-clinician-review"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("clinician OpenAI review helpers", () => {
  it("detects clinician review configuration from OpenAI env", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test")
    expect(isClinicianOpenAiConfigured()).toBe(true)

    vi.stubEnv("DISABLE_OPENAI_CLINICIAN_REVIEW", "true")
    expect(isClinicianOpenAiConfigured()).toBe(false)
  })

  it("selects clinician model and timeout defaults safely", () => {
    vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini")
    expect(getClinicianOpenAiModel()).toBe("gpt-4o-mini")

    vi.stubEnv("OPENAI_CLINICIAN_MODEL", "gpt-4.1-mini")
    expect(getClinicianOpenAiModel()).toBe("gpt-4.1-mini")

    vi.stubEnv("OPENAI_CLINICIAN_TIMEOUT_MS", "bad")
    expect(getClinicianReviewTimeoutMs()).toBe(12000)
  })

  it("builds a compact structured prompt payload for clinician support", () => {
    const payload = buildClinicianReviewPromptInput({
      profile: {
        age: 52,
        gender: "female",
        smokingStatus: "never",
        bmiCategory: "normal",
        isPregnant: false,
        sexuallyActive: false,
        familyHistory: ["sister breast cancer"],
        medicalHistory: [],
        additionalContext: "My sister tested BRCA1 positive.",
      },
      recommendations: [
        {
          id: "breast-cancer",
          name: "Breast Cancer Screening",
          description: "Mammography screening.",
          frequency: "Every 2 years",
          grade: "B",
          primaryProvider: "Radiologist",
          sources: [
            {
              title: "Breast Cancer: Screening",
              organization: "USPSTF",
              url: "https://example.test/breast",
              lastReviewed: "2024",
            },
          ],
        },
      ],
      clinicalReviewFlags: [
        {
          id: "hereditary-breast-risk",
          title: "Possible hereditary risk",
          why: "Family history can change timing.",
          nextStep: "Review with clinician.",
        },
      ],
      personalizationNotes: ["Consider genetics review."],
      highRiskPathways: [],
    })

    expect(payload).toContain('"age": 52')
    expect(payload).toContain("BRCA1")
    expect(payload).toContain("Breast Cancer Screening")
    expect(payload).toContain("Possible hereditary risk")
  })
})
