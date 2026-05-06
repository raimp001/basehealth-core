import { NextResponse } from "next/server"
import {
  enrichRecommendations,
  matchPathways,
  getGuidelineEngineInfo,
  type PatientProfile,
} from "@/lib/guideline-engine"
import { generateClinicianRecommendationReview } from "@/lib/clinical/openai-clinician-review"

// USPSTF Grade A and B Recommendations with Provider Suggestions


type CdcRecommendation = {
  id: string
  name: string
  minAge: number
  maxAge: number
  notes: string
}

const CDC_GUIDELINES: CdcRecommendation[] = [
  { id: 'flu', name: 'Influenza vaccine', minAge: 6, maxAge: 120, notes: 'CDC recommends annual influenza vaccination for everyone 6 months and older.' },
  { id: 'covid', name: 'COVID-19 vaccine', minAge: 6, maxAge: 120, notes: 'CDC recommends staying up to date with age-appropriate COVID-19 vaccination.' },
  { id: 'tdap', name: 'Td/Tdap booster', minAge: 18, maxAge: 120, notes: 'CDC recommends Td or Tdap booster every 10 years for adults.' },
  { id: 'shingles', name: 'Shingles (Shingrix)', minAge: 50, maxAge: 120, notes: 'CDC recommends 2-dose Shingrix for adults 50+.' },
  { id: 'pneumococcal', name: 'Pneumococcal vaccine', minAge: 65, maxAge: 120, notes: 'CDC recommends pneumococcal vaccination for adults 65+ and younger adults with certain risks.' },
]

function getCdcRecommendations(age: number) {
  return CDC_GUIDELINES.filter((g) => age >= g.minAge && age <= g.maxAge)
}

type RecommendationSource = {
  title: string
  organization: string
  url: string
  publishedDate?: string
  lastReviewed?: string
  version?: string
  gradeRationale?: string
}

const DEFAULT_USPSTF_SOURCE: RecommendationSource = {
  title: "USPSTF Grade A & B recommendations",
  organization: "U.S. Preventive Services Task Force",
  url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation-topics/uspstf-and-b-recommendations",
  lastReviewed: "2024",
}

const SOURCES_BY_RECOMMENDATION: Record<string, RecommendationSource[]> = {
  "bp-screening": [
    {
      title: "High Blood Pressure in Adults: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/high-blood-pressure-in-adults-screening",
      publishedDate: "April 2021",
      lastReviewed: "April 2021",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade A: High certainty that screening for hypertension in adults has substantial net benefit. Uncontrolled hypertension is a leading risk factor for cardiovascular disease.",
    },
  ],
  "colorectal-cancer": [
    {
      title: "Colorectal Cancer: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/colorectal-cancer-screening",
      publishedDate: "May 2021",
      lastReviewed: "May 2021",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade A: High certainty that screening for colorectal cancer in adults aged 45-75 has substantial net benefit. Early detection significantly improves survival rates.",
    },
  ],
  "cervical-cancer": [
    {
      title: "Cervical Cancer: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/cervical-cancer-screening",
      publishedDate: "August 2018",
      lastReviewed: "August 2018",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade A: High certainty that screening for cervical cancer in women aged 21-65 has substantial net benefit. Pap and HPV testing are effective in detecting precancerous lesions.",
    },
  ],
  "hiv-screening": [
    {
      title: "HIV Infection: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/human-immunodeficiency-virus-hiv-infection-screening",
      publishedDate: "June 2019",
      lastReviewed: "June 2019",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade A: High certainty that screening for HIV in adolescents and adults aged 15-65 has substantial net benefit. Early treatment with antiretroviral therapy dramatically improves outcomes.",
    },
  ],
  "lung-cancer": [
    {
      title: "Lung Cancer: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/lung-cancer-screening",
      publishedDate: "March 2021",
      lastReviewed: "March 2021",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: High certainty of moderate net benefit for annual low-dose CT screening in adults 50-80 with 20+ pack-year smoking history. Detects early-stage cancers when surgery is curative.",
    },
  ],
  preeclampsia: [
    {
      title: "Aspirin Use to Prevent Preeclampsia and Related Morbidity and Mortality",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/aspirin-to-prevent-preeclampsia-and-related-morbidity-and-mortality-preventive-medication",
      publishedDate: "September 2014",
      lastReviewed: "October 2024",
      version: "Final Recommendation Statement (update pending)",
      gradeRationale: "Grade B: Moderate certainty that low-dose aspirin after 12 weeks of gestation reduces preeclampsia risk in women at high risk.",
    },
  ],
  "breast-cancer": [
    {
      title: "Breast Cancer: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening",
      publishedDate: "April 2024",
      lastReviewed: "April 2024",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty of moderate net benefit for biennial mammography screening in women aged 40-74. Early detection improves treatment options and survival.",
    },
  ],
  "diabetes-screening": [
    {
      title: "Prediabetes and Type 2 Diabetes: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/screening-for-prediabetes-and-type-2-diabetes",
      publishedDate: "August 2021",
      lastReviewed: "August 2021",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for prediabetes and type 2 diabetes in adults 35-70 who are overweight/obese has moderate net benefit. Lifestyle interventions delay diabetes onset.",
    },
  ],
  "depression-screening": [
    {
      title: "Depression and Suicide Risk in Adults: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/depression-and-suicide-risk-in-adults-screening",
      publishedDate: "June 2023",
      lastReviewed: "June 2023",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for depression in adults has moderate net benefit when adequate support for diagnosis, treatment, and follow-up is in place.",
    },
  ],
  "statin-prevention": [
    {
      title: "Statin Use for the Primary Prevention of Cardiovascular Disease",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication",
      publishedDate: "August 2022",
      lastReviewed: "August 2022",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that statin use for primary prevention of CVD events has moderate net benefit in adults 40-75 with 1+ CVD risk factors and 10-year CVD risk >= 10%.",
    },
  ],
  osteoporosis: [
    {
      title: "Osteoporosis to Prevent Fractures: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/osteoporosis-screening",
      publishedDate: "June 2018",
      lastReviewed: "June 2018",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for osteoporosis in postmenopausal women aged 65+ prevents fractures. Bone density testing identifies those who benefit from treatment.",
    },
  ],
  "abdominal-aortic": [
    {
      title: "Abdominal Aortic Aneurysm: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/abdominal-aortic-aneurysm-screening",
      publishedDate: "December 2019",
      lastReviewed: "December 2019",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that one-time screening for AAA by ultrasonography in men aged 65-75 who have ever smoked has moderate net benefit.",
    },
  ],
  "hep-c": [
    {
      title: "Hepatitis C Virus Infection in Adolescents and Adults: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hepatitis-c-screening",
      publishedDate: "March 2020",
      lastReviewed: "March 2020",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for HCV infection in adults aged 18-79 has moderate net benefit. Direct-acting antiviral treatments achieve cure rates exceeding 95%.",
    },
  ],
  "anxiety-screening": [
    {
      title: "Anxiety Disorders in Adults: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/anxiety-adults-screening",
      publishedDate: "June 2023",
      lastReviewed: "June 2023",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for anxiety disorders in adults, including pregnant and postpartum persons, has moderate net benefit.",
    },
  ],
  "sti-screening": [
    {
      title: "Chlamydia and Gonorrhea: Screening",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/chlamydia-and-gonorrhea-screening",
      publishedDate: "September 2014",
      lastReviewed: "September 2021",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that screening for chlamydia and gonorrhea in sexually active women aged 24 and younger has moderate net benefit.",
    },
  ],
  "obesity-counseling": [
    {
      title: "Obesity in Adults: Interventions",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/obesity-in-adults-interventions",
      publishedDate: "June 2018",
      lastReviewed: "June 2018",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that intensive behavioral interventions for adults with obesity (BMI >= 30) have moderate net benefit.",
    },
  ],
  "lipid-screening": [
    {
      title: "Statin Use for the Primary Prevention of Cardiovascular Disease",
      organization: "U.S. Preventive Services Task Force",
      url: "https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication",
      publishedDate: "August 2022",
      lastReviewed: "August 2022",
      version: "Final Recommendation Statement",
      gradeRationale: "Grade B: Moderate certainty that statin use for primary prevention of CVD has moderate net benefit in adults 40-75 with cardiovascular risk factors.",
    },
  ],
}

function getRecommendationSources(recommendationId: string): RecommendationSource[] {
  return SOURCES_BY_RECOMMENDATION[recommendationId] || [DEFAULT_USPSTF_SOURCE]
}

const USPSTF_GUIDELINES = [
  // Grade A - Strongly Recommended
  { 
    id: 'bp-screening', 
    name: 'Blood Pressure Screening', 
    grade: 'A', 
    minAge: 18, 
    maxAge: 120, 
    gender: 'all', 
    frequency: 'Annually', 
    description: 'Screen for high blood pressure in adults 18 years or older. Early detection prevents heart disease and stroke.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Internal Medicine', 'Family Medicine'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'colorectal-cancer', 
    name: 'Colorectal Cancer Screening', 
    grade: 'A', 
    minAge: 45, 
    maxAge: 75, 
    gender: 'all', 
    frequency: 'Every 10 years (colonoscopy) or annually (stool test)', 
    description: 'Colonoscopy or stool-based tests to detect colorectal cancer early when treatment is most effective.',
    primaryProvider: 'Gastroenterologist',
    alternativeProviders: ['Colorectal Surgeon'],
    canBeDoneBy: 'specialist',
    riskFactors: ['family history of colorectal cancer'] 
  },
  { 
    id: 'cervical-cancer', 
    name: 'Cervical Cancer Screening', 
    grade: 'A', 
    minAge: 21, 
    maxAge: 65, 
    gender: 'female', 
    frequency: 'Every 3 years (Pap) or 5 years (HPV co-test)', 
    description: 'Pap smear and/or HPV testing to detect cervical cancer and precancerous changes.',
    primaryProvider: 'OB/GYN',
    alternativeProviders: ['Primary Care Physician', 'Family Medicine'],
    canBeDoneBy: 'either',
    riskFactors: [] 
  },
  { 
    id: 'hiv-screening', 
    name: 'HIV Screening', 
    grade: 'A', 
    minAge: 15, 
    maxAge: 65, 
    gender: 'all', 
    frequency: 'At least once; more often if at risk', 
    description: 'One-time HIV test for all adults. Early detection allows for effective treatment.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Infectious Disease Specialist', 'Family Medicine'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'lung-cancer', 
    name: 'Lung Cancer Screening', 
    grade: 'A', 
    minAge: 50, 
    maxAge: 80, 
    gender: 'all', 
    frequency: 'Annually', 
    description: 'Annual low-dose CT scan for adults with significant smoking history (20+ pack-years).',
    primaryProvider: 'Pulmonologist',
    alternativeProviders: ['Radiologist', 'Thoracic Surgeon'],
    canBeDoneBy: 'specialist',
    riskFactors: ['smoking', 'current smoker', 'former smoker', 'tobacco use'] 
  },
  { 
    id: 'preeclampsia', 
    name: 'Preeclampsia Prevention', 
    grade: 'A', 
    minAge: 18, 
    maxAge: 50, 
    gender: 'female', 
    frequency: 'During pregnancy', 
    description: 'Low-dose aspirin starting at 12 weeks for pregnant women at high risk of preeclampsia.',
    primaryProvider: 'OB/GYN',
    alternativeProviders: ['Maternal-Fetal Medicine Specialist'],
    canBeDoneBy: 'specialist',
    riskFactors: ['pregnant', 'high blood pressure'] 
  },

  // Grade B - Recommended
  { 
    id: 'breast-cancer', 
    name: 'Breast Cancer Screening (Mammogram)', 
    grade: 'B', 
    minAge: 50, 
    maxAge: 74, 
    gender: 'female', 
    frequency: 'Every 2 years', 
    description: 'Biennial screening mammography to detect breast cancer early.',
    primaryProvider: 'Radiologist',
    alternativeProviders: ['Breast Surgeon', 'OB/GYN (referral)'],
    canBeDoneBy: 'specialist',
    riskFactors: [] 
  },
  { 
    id: 'diabetes-screening', 
    name: 'Diabetes Screening', 
    grade: 'B', 
    minAge: 35, 
    maxAge: 70, 
    gender: 'all', 
    frequency: 'Every 3 years', 
    description: 'Blood glucose or HbA1c test to screen for prediabetes and type 2 diabetes in overweight adults.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Endocrinologist', 'Internal Medicine'],
    canBeDoneBy: 'primary',
    riskFactors: ['overweight', 'obese', 'family history of diabetes'] 
  },
  { 
    id: 'depression-screening', 
    name: 'Depression Screening', 
    grade: 'B', 
    minAge: 12, 
    maxAge: 120, 
    gender: 'all', 
    frequency: 'Annually', 
    description: 'Questionnaire-based screening for major depressive disorder (PHQ-9).',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Psychiatrist', 'Psychologist'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'statin-prevention', 
    name: 'Statin for Heart Disease Prevention', 
    grade: 'B', 
    minAge: 40, 
    maxAge: 75, 
    gender: 'all', 
    frequency: 'Discuss with provider', 
    description: 'Statin medication for adults with cardiovascular risk factors to prevent heart attacks and strokes.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Cardiologist', 'Internal Medicine'],
    canBeDoneBy: 'primary',
    riskFactors: ['high cholesterol', 'high blood pressure', 'diabetes', 'smoking'] 
  },
  { 
    id: 'osteoporosis', 
    name: 'Osteoporosis Screening (Bone Density)', 
    grade: 'B', 
    minAge: 65, 
    maxAge: 120, 
    gender: 'female', 
    frequency: 'As recommended by provider', 
    description: 'DEXA bone density scan to screen for osteoporosis and fracture risk.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Endocrinologist', 'Rheumatologist'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'abdominal-aortic', 
    name: 'Abdominal Aortic Aneurysm Screening', 
    grade: 'B', 
    minAge: 65, 
    maxAge: 75, 
    gender: 'male', 
    frequency: 'One-time', 
    description: 'One-time ultrasound screening for men 65-75 who have ever smoked.',
    primaryProvider: 'Vascular Surgeon',
    alternativeProviders: ['Primary Care (referral)', 'Radiologist'],
    canBeDoneBy: 'specialist',
    riskFactors: ['smoking', 'former smoker'] 
  },
  { 
    id: 'hep-c', 
    name: 'Hepatitis C Screening', 
    grade: 'B', 
    minAge: 18, 
    maxAge: 79, 
    gender: 'all', 
    frequency: 'One-time (more if at risk)', 
    description: 'Blood test to screen for hepatitis C virus infection.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Gastroenterologist', 'Infectious Disease'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'anxiety-screening', 
    name: 'Anxiety Screening', 
    grade: 'B', 
    minAge: 8, 
    maxAge: 64, 
    gender: 'all', 
    frequency: 'Annually', 
    description: 'Questionnaire-based screening for anxiety disorders (GAD-7).',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Psychiatrist', 'Psychologist'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
  { 
    id: 'sti-screening', 
    name: 'STI Screening (Chlamydia/Gonorrhea)', 
    grade: 'B', 
    minAge: 15, 
    maxAge: 24, 
    gender: 'female', 
    frequency: 'Annually if sexually active', 
    description: 'Annual screening for chlamydia and gonorrhea in sexually active young women.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['OB/GYN', 'Urgent Care'],
    canBeDoneBy: 'primary',
    riskFactors: ['sexually active'] 
  },
  { 
    id: 'obesity-counseling', 
    name: 'Weight Management Counseling', 
    grade: 'B', 
    minAge: 18, 
    maxAge: 120, 
    gender: 'all', 
    frequency: 'Ongoing', 
    description: 'Intensive behavioral interventions for adults with obesity to promote weight loss.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Registered Dietitian', 'Endocrinologist'],
    canBeDoneBy: 'primary',
    riskFactors: ['overweight', 'obese', 'high bmi'] 
  },
  { 
    id: 'lipid-screening', 
    name: 'Cholesterol Screening', 
    grade: 'B', 
    minAge: 40, 
    maxAge: 75, 
    gender: 'all', 
    frequency: 'Every 5 years', 
    description: 'Lipid panel blood test to measure cholesterol levels and assess cardiovascular risk.',
    primaryProvider: 'Primary Care Physician',
    alternativeProviders: ['Cardiologist', 'Internal Medicine'],
    canBeDoneBy: 'primary',
    riskFactors: [] 
  },
]

type Recommendation = {
  id: string
  name: string
  description: string
  frequency: string
  grade: string
  importance: string
  primaryProvider: string
  alternativeProviders: string[]
  canBeDoneBy: "primary" | "specialist" | "either"
  providerNote: string
  sources: RecommendationSource[]
}

type ClinicalReviewFlag = {
  id: string
  title: string
  why: string
  nextStep: string
}

type ContextExtraction = {
  extractedRiskFactors: string[]
  clinicalReviewFlags: ClinicalReviewFlag[]
  personalizationNotes: string[]
}

function getRecommendations(age: number, gender: string, riskFactors: string[]) {
  const normalizedGender = gender.toLowerCase()
  const normalizedRisks = riskFactors.map(r => r.toLowerCase())
  
  return USPSTF_GUIDELINES.filter(g => {
    // Age check
    if (age < g.minAge || age > g.maxAge) return false
    
    // Gender check
    if (g.gender !== 'all' && g.gender !== normalizedGender) return false
    
    // If guideline has specific risk factors, check if patient has any
    if (g.riskFactors.length > 0) {
      const hasRiskFactor = g.riskFactors.some(rf => 
        normalizedRisks.some(nr => nr.includes(rf) || rf.includes(nr))
      )
      if (!hasRiskFactor) return false
    }
    
    return true
  }).map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    frequency: g.frequency,
    grade: g.grade,
    importance: g.grade === 'A' ? 'essential' : 'recommended',
    // Provider information
    primaryProvider: g.primaryProvider,
    alternativeProviders: g.alternativeProviders,
    canBeDoneBy: g.canBeDoneBy as Recommendation["canBeDoneBy"],
    providerNote: g.canBeDoneBy === 'primary' 
      ? `Your Primary Care Physician can perform this screening during a regular visit.`
      : g.canBeDoneBy === 'specialist'
      ? `This requires a specialist. Ask your PCP for a referral to a ${g.primaryProvider}.`
      : `This can be done by your Primary Care Physician or a ${g.primaryProvider}.`,
    sources: getRecommendationSources(g.id),
  }))
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function addRecommendationIfMissing(
  recommendations: Recommendation[],
  next: Recommendation[],
  recommendationId: string,
): Recommendation[] {
  if (recommendations.some((item) => item.id === recommendationId)) return recommendations
  const candidate = next.find((item) => item.id === recommendationId)
  if (!candidate) return recommendations
  return [...recommendations, candidate]
}

function parseAdditionalContext(additionalContext: string): ContextExtraction {
  const text = String(additionalContext || "").trim()
  if (!text) {
    return {
      extractedRiskFactors: [],
      clinicalReviewFlags: [],
      personalizationNotes: [],
    }
  }

  const lower = text.toLowerCase()
  const extractedRiskFactors: string[] = []
  const clinicalReviewFlags: ClinicalReviewFlag[] = []
  const personalizationNotes: string[] = []

  const hasHereditaryBreastSignal =
    /(brca1|brca2|brca|hereditary breast|hereditary ovarian|first[- ]degree|mother|sister|daughter)/i.test(lower) &&
    /(breast|ovarian|cancer)/i.test(lower)

  if (hasHereditaryBreastSignal) {
    extractedRiskFactors.push("family history of breast cancer", "possible hereditary breast/ovarian cancer risk")
    clinicalReviewFlags.push({
      id: "hereditary-breast-risk",
      title: "Possible hereditary breast/ovarian cancer risk",
      why: "You mentioned BRCA/family-history details that can change routine screening intervals.",
      nextStep:
        "Review with a PCP, OB/GYN, or genetics specialist for individualized timing and whether MRI/genetic counseling is appropriate.",
    })
    personalizationNotes.push(
      "People with hereditary breast/ovarian risk may need earlier or more intensive screening than average-risk USPSTF schedules.",
    )
  }

  const hasChestRadiationSignal = /(chest radiation|mantle radiation|mediastinal radiation|hodgkin)/i.test(lower)
  if (hasChestRadiationSignal) {
    extractedRiskFactors.push("prior chest radiation")
    clinicalReviewFlags.push({
      id: "prior-chest-radiation",
      title: "Prior chest radiation history",
      why: "Prior chest radiation can place patients into a higher-risk breast screening pathway.",
      nextStep:
        "Discuss timeline-based breast screening with your clinician (often different from standard-risk schedules).",
    })
    personalizationNotes.push(
      "A prior chest-radiation history may justify earlier and/or modality-adjusted breast screening after clinician review.",
    )
  }

  const hasHereditaryColonSignal = /(lynch|fap|familial adenomatous|hereditary colorectal|multiple relatives)/i.test(lower)
  if (hasHereditaryColonSignal) {
    extractedRiskFactors.push("family history of colorectal cancer", "possible hereditary colorectal cancer risk")
    clinicalReviewFlags.push({
      id: "hereditary-colorectal-risk",
      title: "Possible hereditary colorectal cancer risk",
      why: "You included hereditary colorectal history terms that can change colon screening start age and cadence.",
      nextStep:
        "Review with PCP/GI/genetics for personalized colorectal screening intervals and potential genetic evaluation.",
    })
    personalizationNotes.push(
      "Hereditary colorectal risk often requires earlier and more frequent screening than average-risk guidance.",
    )
  }

  const hasImmunosuppressionSignal = /(immunosupp|transplant|hiv|on chemo|long[- ]term steroid|biologic)/i.test(lower)
  if (hasImmunosuppressionSignal) {
    extractedRiskFactors.push("possible immunocompromised status")
    clinicalReviewFlags.push({
      id: "immunocompromised",
      title: "Possible immunocompromised status",
      why: "Immunocompromise can alter preventive screening and vaccine strategy.",
      nextStep: "Confirm medication/condition details with your clinician to personalize your prevention plan.",
    })
  }

  return {
    extractedRiskFactors: unique(extractedRiskFactors),
    clinicalReviewFlags,
    personalizationNotes: unique(personalizationNotes),
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ageParam = searchParams.get("age")
    const gender = searchParams.get("gender") || "all"
    const riskFactorsParam = searchParams.get("riskFactors")
    const riskFactors = riskFactorsParam ? riskFactorsParam.split(",").filter(Boolean) : []

    if (!ageParam) {
      return NextResponse.json({ error: "Age parameter is required" }, { status: 400 })
    }

    const age = Number.parseInt(ageParam)
    if (isNaN(age)) {
      return NextResponse.json({ error: "Age must be a number" }, { status: 400 })
    }

    const recommendations = getRecommendations(age, gender, riskFactors)
    
    // Sort by grade (A first, then B)
    recommendations.sort((a, b) => a.grade.localeCompare(b.grade))

    const cdcRecommendations = getCdcRecommendations(age)

    return NextResponse.json({ 
      success: true,
      recommendations,
      cdcRecommendations,
      count: recommendations.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Error fetching screening recommendations:", error)
    return NextResponse.json({ 
      success: false,
      error: "An error occurred while fetching screening recommendations" 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      age, 
      gender, 
      smokingStatus, 
      medicalHistory = [], 
      familyHistory = [], 
      bmiCategory,
      isPregnant,
      sexuallyActive,
      additionalContext = "",
    } = body

    if (!age || !gender) {
      return NextResponse.json({ 
        success: false,
        error: "Age and gender are required" 
      }, { status: 400 })
    }

    // Build comprehensive risk factors list
    const riskFactors: string[] = []
    
    // Smoking
    if (smokingStatus === 'current') riskFactors.push('smoking', 'current smoker', 'tobacco use')
    if (smokingStatus === 'former') riskFactors.push('former smoker')
    
    // BMI
    if (bmiCategory === 'overweight') riskFactors.push('overweight')
    if (bmiCategory === 'obese') riskFactors.push('obese', 'high bmi')
    
    // Pregnancy
    if (isPregnant) riskFactors.push('pregnant')
    
    // Sexual activity
    if (sexuallyActive) riskFactors.push('sexually active')
    
    // Medical history
    if (medicalHistory.includes('hypertension')) riskFactors.push('high blood pressure')
    if (medicalHistory.includes('diabetes')) riskFactors.push('diabetes')
    if (medicalHistory.includes('high-cholesterol')) riskFactors.push('high cholesterol')
    
    // Family history
    if (familyHistory.includes('cancer')) riskFactors.push('family history of colorectal cancer')
    if (familyHistory.includes('diabetes')) riskFactors.push('family history of diabetes')
    if (familyHistory.includes('heart-disease')) riskFactors.push('cardiovascular disease')

    const parsedContext = parseAdditionalContext(String(additionalContext || ""))
    riskFactors.push(...parsedContext.extractedRiskFactors)

    let recommendations = getRecommendations(Number(age), gender, riskFactors)

    // High-risk context can require guideline pathways not fully captured by baseline USPSTF-only filters.
    // We include baseline breast/colorectal items as anchors for clinician review when those flags appear.
    const baselineRecommendations = getRecommendations(Number(age), gender, [])
    if (parsedContext.clinicalReviewFlags.some((flag) => flag.id === "hereditary-breast-risk" || flag.id === "prior-chest-radiation")) {
      recommendations = addRecommendationIfMissing(recommendations, baselineRecommendations, "breast-cancer")
    }
    if (parsedContext.clinicalReviewFlags.some((flag) => flag.id === "hereditary-colorectal-risk")) {
      recommendations = addRecommendationIfMissing(recommendations, baselineRecommendations, "colorectal-cancer")
    }

    const cdcRecommendations = getCdcRecommendations(Number(age))
    
    // Sort by grade
    recommendations.sort((a, b) => a.grade.localeCompare(b.grade))

    // v2: Enrich with guideline engine (high-risk pathways, due dates, versioning)
    const profile: PatientProfile = {
      age: Number(age),
      gender: gender.toLowerCase() as "male" | "female" | "other",
      smokingStatus: smokingStatus === "current" ? "current" : smokingStatus === "former" ? "former" : "never",
      bmiCategory: bmiCategory || "normal",
      isPregnant: isPregnant || false,
      sexuallyActive: sexuallyActive || false,
      familyHistory: familyHistory || [],
      medicalHistory: medicalHistory || [],
      additionalContext: additionalContext || "",
    }

    const enriched = enrichRecommendations(recommendations, profile)
    const matchedPathways = matchPathways(profile)
    const highRiskPathways = matchedPathways.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      referrals: p.referrals,
      source: p.source,
    }))

    const clinicianReview = await generateClinicianRecommendationReview({
      profile,
      recommendations: enriched.map((rec) => ({
        id: rec.id,
        name: rec.name,
        description: rec.description,
        frequency: rec.frequency,
        grade: rec.grade,
        primaryProvider: rec.primaryProvider,
        adjustedFrequency: rec.adjustedFrequency,
        pathwayApplied: rec.pathwayApplied,
        pathwayNote: rec.pathwayNote,
        sources: (rec.sources || []).map((source) => ({
          title: source.title || source.organization || "Guideline source",
          organization: source.organization || rec.sourceOrg || "Guideline source",
          url: source.url || rec.sourceUrl || "",
          publishedDate: source.publishedDate,
          lastReviewed: source.lastReviewed,
          version: source.version,
          gradeRationale: source.gradeRationale || rec.gradeRationale,
        })),
      })),
      clinicalReviewFlags: parsedContext.clinicalReviewFlags,
      personalizationNotes: parsedContext.personalizationNotes,
      highRiskPathways,
    })

    // Summarize provider types needed
    const specialistNeeded = recommendations.filter(r => r.canBeDoneBy === 'specialist')
    const primaryCareCanDo = recommendations.filter(r => r.canBeDoneBy === 'primary')

    return NextResponse.json({ 
      success: true,
      recommendations: enriched,
      cdcRecommendations,
      count: enriched.length,
      summary: {
        totalScreenings: enriched.length,
        gradeACount: enriched.filter(r => r.grade === 'A').length,
        gradeBCount: enriched.filter(r => r.grade === 'B').length,
        primaryCareScreenings: primaryCareCanDo.length,
        specialistReferralsNeeded: specialistNeeded.length,
        specialistsNeeded: [...new Set(specialistNeeded.map(r => r.primaryProvider))],
        highRiskPathwaysMatched: matchedPathways.length,
      },
      riskProfile: {
        factors: unique(riskFactors),
        level: matchedPathways.length > 0 ? 'elevated' : riskFactors.length > 3 ? 'elevated' : riskFactors.length > 0 ? 'moderate' : 'low'
      },
      highRiskPathways,
      clinicalReviewFlags: parsedContext.clinicalReviewFlags,
      clinicianReview,
      personalizationNotes: parsedContext.personalizationNotes,
      contextSummary: {
        hasAdditionalContext: Boolean(String(additionalContext || "").trim()),
        extractedRiskFactors: parsedContext.extractedRiskFactors,
      },
      engine: getGuidelineEngineInfo(),
      disclaimer:
        "This is informational screening guidance. Higher-risk details can require individualized plans; confirm timing and modality with a licensed clinician.",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error("Error processing screening assessment:", error)
    return NextResponse.json({ 
      success: false,
      error: "An error occurred while processing your assessment" 
    }, { status: 500 })
  }
}
