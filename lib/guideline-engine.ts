/**
 * Guideline Engine v2
 *
 * - Versioned rule sets with explicit source provenance
 * - High-risk pathway branching (BRCA, Lynch, chest radiation, immunocompromised)
 * - Age-adjusted screening intervals
 * - Abnormal-result follow-up recalculation
 * - Extensible for future guideline updates
 */

// ============================================================================
// VERSION METADATA
// ============================================================================

export const ENGINE_VERSION = "2.0.0"
export const LAST_UPDATED = "2026-01-25"
export const GUIDELINE_SOURCES = {
  USPSTF: {
    name: "U.S. Preventive Services Task Force",
    url: "https://www.uspreventiveservicestaskforce.org",
    lastChecked: "2026-01-25",
  },
  ACS: {
    name: "American Cancer Society",
    url: "https://www.cancer.org",
    lastChecked: "2026-01-25",
  },
  NCCN: {
    name: "National Comprehensive Cancer Network",
    url: "https://www.nccn.org",
    lastChecked: "2026-01-25",
  },
  CDC: {
    name: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov",
    lastChecked: "2026-01-25",
  },
}

// ============================================================================
// TYPES
// ============================================================================

export type RiskLevel = "average" | "elevated" | "high" | "very-high"

export interface PatientProfile {
  age: number
  gender: "male" | "female" | "other"
  smokingStatus: "never" | "former" | "current"
  packYears?: number
  bmiCategory: "underweight" | "normal" | "overweight" | "obese"
  isPregnant: boolean
  sexuallyActive: boolean
  familyHistory: string[]
  medicalHistory: string[]
  additionalContext?: string
  completedScreenings?: Record<string, string> // screeningId -> last completed ISO date
  abnormalResults?: Record<string, string> // screeningId -> most recent abnormal result date
}

export interface HighRiskPathway {
  id: string
  name: string
  triggerConditions: string[]
  description: string
  modifiedScreenings: Array<{
    screeningId: string
    startAge?: number
    frequency?: string
    modality?: string
    note: string
  }>
  referrals: string[]
  source: string
}

export interface EnrichedRecommendation {
  id: string
  name: string
  description: string
  frequency: string
  grade: string
  importance: "essential" | "recommended" | "conditional"
  primaryProvider: string
  alternativeProviders: string[]
  canBeDoneBy: "primary" | "specialist" | "either"
  providerNote: string

  // v2 additions
  riskLevel: RiskLevel
  adjustedFrequency?: string
  adjustedStartAge?: number
  pathwayApplied?: string
  pathwayNote?: string
  nextDueDate?: string
  isOverdue?: boolean
  intervalMonths: number
  guidelineVersion: string
  lastUpdated: string
  sourceOrg: string
  sourceUrl: string
  gradeRationale: string
  sources?: Array<{
    title?: string
    organization?: string
    url?: string
    publishedDate?: string
    lastReviewed?: string
    version?: string
    gradeRationale?: string
  }>
}

// ============================================================================
// HIGH-RISK PATHWAYS
// ============================================================================

export const HIGH_RISK_PATHWAYS: HighRiskPathway[] = [
  {
    id: "hereditary-breast-ovarian",
    name: "Hereditary Breast/Ovarian Cancer Syndrome",
    triggerConditions: [
      "brca1", "brca2", "brca",
      "hereditary breast", "hereditary ovarian",
      "first-degree relative breast cancer",
      "mother breast cancer", "sister breast cancer",
    ],
    description:
      "Individuals with BRCA1/2 mutations or strong family history of breast/ovarian cancer require modified screening starting earlier with additional modalities.",
    modifiedScreenings: [
      {
        screeningId: "breast-cancer",
        startAge: 25,
        frequency: "Annually (MRI alternating with mammogram every 6 months)",
        modality: "Breast MRI + Mammogram",
        note: "Start at age 25 or 10 years before youngest affected relative, whichever is earlier. Alternate MRI and mammogram every 6 months.",
      },
    ],
    referrals: [
      "Genetic counselor for BRCA testing",
      "High-risk breast clinic",
      "OB/GYN for ovarian cancer risk discussion",
    ],
    source: "NCCN Guidelines for Genetic/Familial High-Risk Assessment: Breast, Ovarian, and Pancreatic (v2.2024)",
  },
  {
    id: "lynch-syndrome",
    name: "Lynch Syndrome / Hereditary Colorectal Cancer",
    triggerConditions: [
      "lynch", "hnpcc", "hereditary colorectal",
      "familial adenomatous polyposis", "fap",
      "multiple relatives colorectal",
    ],
    description:
      "Lynch syndrome carriers and those with strong hereditary colorectal cancer risk need earlier and more frequent colonoscopy.",
    modifiedScreenings: [
      {
        screeningId: "colorectal-cancer",
        startAge: 20,
        frequency: "Every 1-2 years starting at age 20-25",
        note: "Begin colonoscopy at age 20-25 or 2-5 years before youngest affected relative. Repeat every 1-2 years.",
      },
    ],
    referrals: [
      "Genetic counselor for Lynch testing (MLH1, MSH2, MSH6, PMS2)",
      "Gastroenterologist specializing in hereditary GI cancer",
    ],
    source: "NCCN Guidelines for Genetic/Familial High-Risk Assessment: Colorectal (v1.2024)",
  },
  {
    id: "prior-chest-radiation",
    name: "Prior Chest Radiation History",
    triggerConditions: [
      "chest radiation", "mantle radiation",
      "mediastinal radiation", "hodgkin",
    ],
    description:
      "History of chest radiation (e.g., for Hodgkin lymphoma) significantly increases breast cancer risk and requires modified screening.",
    modifiedScreenings: [
      {
        screeningId: "breast-cancer",
        startAge: 25,
        frequency: "Annually with MRI + Mammogram starting 8 years post-radiation or age 25",
        modality: "Breast MRI + Mammogram",
        note: "Begin dual-modality screening 8 years after chest radiation or at age 25, whichever is later.",
      },
    ],
    referrals: [
      "Breast cancer high-risk clinic",
      "Survivorship clinic if post-Hodgkin lymphoma",
    ],
    source: "ACS Guidelines for Breast Cancer Screening with MRI",
  },
  {
    id: "immunocompromised",
    name: "Immunocompromised Status",
    triggerConditions: [
      "immunosupp", "transplant", "hiv",
      "on chemo", "long-term steroid", "biologic therapy",
    ],
    description:
      "Immunocompromised individuals may need adjusted screening schedules and additional preventive measures.",
    modifiedScreenings: [
      {
        screeningId: "cervical-cancer",
        frequency: "Annually (vs every 3 years for average risk)",
        note: "HIV+ women should be screened annually due to higher HPV persistence and cervical dysplasia risk.",
      },
    ],
    referrals: [
      "Infectious disease specialist for comprehensive prevention plan",
      "Vaccine review (live vaccines may be contraindicated)",
    ],
    source: "CDC Clinical Guidelines for Immunocompromised Patients",
  },
  {
    id: "heavy-smoker",
    name: "Heavy Smoking History (20+ pack-years)",
    triggerConditions: [
      "20 pack-years", "heavy smoker", "30 pack-years",
    ],
    description:
      "Adults aged 50-80 with 20+ pack-year smoking history qualify for annual low-dose CT lung screening.",
    modifiedScreenings: [
      {
        screeningId: "lung-cancer",
        frequency: "Annually (mandatory for qualifying individuals)",
        note: "Annual LDCT for current smokers or those who quit within last 15 years with 20+ pack-year history.",
      },
      {
        screeningId: "abdominal-aortic",
        frequency: "One-time screening (men 65-75 who have ever smoked)",
        note: "One-time ultrasound recommended for men 65-75 with any smoking history.",
      },
    ],
    referrals: [
      "Smoking cessation program",
      "Pulmonologist for lung cancer screening enrollment",
    ],
    source: "USPSTF Lung Cancer Screening Recommendation (2021)",
  },
]

// ============================================================================
// INTERVAL CALCULATION
// ============================================================================

export function frequencyToMonths(frequency: string): number {
  const f = (frequency || "").toLowerCase()
  if (f.includes("every 10 years")) return 120
  if (f.includes("every 5 years")) return 60
  if (f.includes("every 3 years")) return 36
  if (f.includes("every 2 years") || f.includes("biennial")) return 24
  if (f.includes("annual") || f.includes("every year")) return 12
  if (f.includes("every 6 months") || f.includes("semi-annual")) return 6
  if (f.includes("every 1-2 years")) return 18
  if (f.includes("once") || f.includes("one-time")) return 0
  if (f.includes("ongoing") || f.includes("discuss")) return 12
  return 12
}

export function calculateNextDueFromCompletion(
  completedDate: string,
  intervalMonths: number,
  hasAbnormalResult: boolean,
  abnormalFollowUpDate?: string,
): { nextDue: string | null; isOverdue: boolean } {
  if (intervalMonths === 0) return { nextDue: null, isOverdue: false }

  if (hasAbnormalResult && abnormalFollowUpDate) {
    const followUp = new Date(abnormalFollowUpDate)
    if (!isNaN(followUp.getTime())) {
      return {
        nextDue: followUp.toISOString(),
        isOverdue: followUp <= new Date(),
      }
    }
  }

  const completed = new Date(completedDate)
  if (isNaN(completed.getTime())) return { nextDue: null, isOverdue: false }

  const adjustedMonths = hasAbnormalResult
    ? Math.max(Math.floor(intervalMonths / 2), 6)
    : intervalMonths

  const nextDue = new Date(completed)
  nextDue.setMonth(nextDue.getMonth() + adjustedMonths)

  return {
    nextDue: nextDue.toISOString(),
    isOverdue: nextDue <= new Date(),
  }
}

// ============================================================================
// PATHWAY MATCHING
// ============================================================================

export function matchPathways(
  profile: PatientProfile,
): HighRiskPathway[] {
  const allContext = [
    ...(profile.familyHistory || []),
    ...(profile.medicalHistory || []),
    profile.additionalContext || "",
  ]
    .join(" ")
    .toLowerCase()

  // Add smoking-specific pathway check
  if (
    profile.smokingStatus === "current" ||
    (profile.smokingStatus === "former" && (profile.packYears || 0) >= 20)
  ) {
    allContext.concat(" 20 pack-years heavy smoker")
  }

  return HIGH_RISK_PATHWAYS.filter((pathway) =>
    pathway.triggerConditions.some((trigger) => allContext.includes(trigger)),
  )
}

// ============================================================================
// ENRICHMENT ENGINE
// ============================================================================

export function enrichRecommendations(
  baseRecommendations: Array<{
    id: string
    name: string
    description: string
    frequency: string
    grade: string
    primaryProvider: string
    alternativeProviders: string[]
    canBeDoneBy: string
    providerNote: string
    sources?: Array<{
      gradeRationale?: string
      publishedDate?: string
      lastReviewed?: string
      url?: string
      organization?: string
    }>
  }>,
  profile: PatientProfile,
): EnrichedRecommendation[] {
  const matchedPathways = matchPathways(profile)
  const completedScreenings = profile.completedScreenings || {}
  const abnormalResults = profile.abnormalResults || {}

  return baseRecommendations.map((rec) => {
    let riskLevel: RiskLevel = "average"
    let adjustedFrequency: string | undefined
    let adjustedStartAge: number | undefined
    let pathwayApplied: string | undefined
    let pathwayNote: string | undefined

    // Check if any pathway modifies this screening
    for (const pathway of matchedPathways) {
      const modification = pathway.modifiedScreenings.find(
        (m) => m.screeningId === rec.id,
      )
      if (modification) {
        riskLevel = "high"
        adjustedFrequency = modification.frequency
        adjustedStartAge = modification.startAge
        pathwayApplied = pathway.name
        pathwayNote = modification.note
        break
      }
    }

    // If not modified by pathway but has risk factors
    if (riskLevel === "average" && matchedPathways.length > 0) {
      riskLevel = "elevated"
    }

    const effectiveFrequency = adjustedFrequency || rec.frequency
    const intervalMonths = frequencyToMonths(effectiveFrequency)

    // Calculate next due date
    let nextDueDate: string | undefined
    let isOverdue = false

    const lastCompleted = completedScreenings[rec.id]
    if (lastCompleted) {
      const hasAbnormal = !!abnormalResults[rec.id]
      const result = calculateNextDueFromCompletion(
        lastCompleted,
        intervalMonths,
        hasAbnormal,
      )
      nextDueDate = result.nextDue || undefined
      isOverdue = result.isOverdue
    }

    const source = rec.sources?.[0]

    return {
      id: rec.id,
      name: rec.name,
      description: rec.description,
      frequency: rec.frequency,
      grade: rec.grade,
      importance:
        rec.grade === "A"
          ? "essential"
          : riskLevel === "high"
          ? "essential"
          : "recommended",
      primaryProvider: rec.primaryProvider,
      alternativeProviders: rec.alternativeProviders,
      canBeDoneBy: rec.canBeDoneBy as "primary" | "specialist" | "either",
      providerNote: rec.providerNote,

      // v2 enrichment
      riskLevel,
      adjustedFrequency,
      adjustedStartAge,
      pathwayApplied,
      pathwayNote,
      nextDueDate,
      isOverdue,
      intervalMonths,
      guidelineVersion: ENGINE_VERSION,
      lastUpdated: LAST_UPDATED,
      sourceOrg: source?.organization || "USPSTF",
      sourceUrl: source?.url || "",
      gradeRationale: source?.gradeRationale || "",
      sources: rec.sources || [],
    }
  })
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getGuidelineEngineInfo() {
  return {
    version: ENGINE_VERSION,
    lastUpdated: LAST_UPDATED,
    totalGuidelines: 16,
    totalHighRiskPathways: HIGH_RISK_PATHWAYS.length,
    sources: Object.keys(GUIDELINE_SOURCES),
    capabilities: [
      "Age/sex/risk factor matching",
      "High-risk pathway branching (BRCA, Lynch, chest radiation, immunocompromised, heavy smoking)",
      "Abnormal result interval shortening",
      "Due date calculation with overdue detection",
      "Versioned guideline provenance",
      "Multi-source citation (USPSTF, ACS, NCCN, CDC)",
    ],
  }
}
