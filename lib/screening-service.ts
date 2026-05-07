import type { ScreeningRecommendation } from "@/types/user"
import { uspstfGuidelines } from "@/lib/uspstf-guidelines"

/**
 * Get screening recommendations based on age and gender (USPSTF guidelines)
 * @param age Patient age
 * @param gender Patient gender
 * @param riskFactors Array of risk factors
 * @returns Promise resolving to an array of screening recommendations
 */
export async function getScreeningRecommendations(
  age: number,
  gender = "all",
  riskFactors: string[] = []
): Promise<ScreeningRecommendation[]> {
  // Use the risk factor logic from the guidelines file
  return uspstfGuidelines
    .filter((g) =>
      (g.gender === gender || g.gender === "all") &&
      age >= g.minAge &&
      age <= g.maxAge &&
      (
        riskFactors.length === 0 ||
        g.riskFactors.length === 0 ||
        g.riskFactors.some(rf =>
          riskFactors.some(f =>
            f.toLowerCase().includes(rf.toLowerCase()) || rf.toLowerCase().includes(f.toLowerCase())
          )
        )
      )
    )
    .map((g) => ({
      id: g.screening.replace(/\s+/g, "-").toLowerCase(),
      name: g.screening,
      description: g.description,
      ageRange: { min: g.minAge, max: g.maxAge },
      gender: g.gender as "male" | "female" | "all",
      frequency: g.frequency,
      importance: g.grade === "A" ? "essential" : g.grade === "B" ? "recommended" : "routine",
      specialtyNeeded: "Primary Care",
      riskFactors: g.riskFactors ?? [],
      grade: g.grade,
    }))
}

/**
 * Prioritize recommendations by importance
 * @param recommendations Array of screening recommendations
 * @returns Prioritized array of screening recommendations
 */
export function prioritizeRecommendations(recommendations: ScreeningRecommendation[]): ScreeningRecommendation[] {
  // Define importance order
  const importanceOrder = {
    essential: 1,
    recommended: 2,
    routine: 3,
  }

  // Sort by importance
  return [...recommendations].sort((a, b) => {
    const importanceA = importanceOrder[a.importance as keyof typeof importanceOrder] || 999
    const importanceB = importanceOrder[b.importance as keyof typeof importanceOrder] || 999
    return importanceA - importanceB
  })
}

/**
 * Filter recommendations by risk factors
 * @param recommendations Array of screening recommendations
 * @param riskFactors Array of risk factors
 * @returns Filtered array of screening recommendations
 */
export function getRecommendationsByRiskFactors(
  recommendations: ScreeningRecommendation[],
  riskFactors: string[],
): ScreeningRecommendation[] {
  if (!riskFactors.length) {
    return recommendations
  }

  // Include recommendations that match any of the risk factors
  // or don't have specific risk factors listed
  return recommendations.filter((recommendation) => {
    // If recommendation doesn't have risk factors, include it
    if (!recommendation.riskFactors || recommendation.riskFactors.length === 0) {
      return true
    }

    // Check if any of the patient's risk factors match the recommendation's risk factors
    return riskFactors.some((factor) =>
      recommendation.riskFactors?.some((rf) => rf.toLowerCase().includes(factor.toLowerCase())),
    )
  })
}
