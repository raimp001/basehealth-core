/**
 * Caregiver Search API
 * 
 * Search for verified caregivers by location, specialty, and availability.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const US_STATE_CODES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
}

const STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATE_CODES).map(([code, name]) => [name.toLowerCase(), code]),
)

function buildLocationTerms(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const terms = new Set<string>()
  const add = (value: string | undefined) => {
    const normalized = value?.trim()
    if (!normalized) return
    terms.add(normalized)
  }

  add(trimmed)

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  parts.forEach(add)

  const tail = parts.at(-1) ?? trimmed
  const upperTail = tail.toUpperCase()
  const stateCode = US_STATE_CODES[upperTail] ? upperTail : STATE_NAME_TO_CODE[tail.toLowerCase()]

  if (stateCode) {
    add(stateCode)
    add(US_STATE_CODES[stateCode])
  }

  return Array.from(terms)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zipCode = searchParams.get("zipCode")
    const specialty = searchParams.get("specialty")
    const location = searchParams.get("location")
    const urgent = searchParams.get("urgent") === "true"
    const limit = parseInt(searchParams.get("limit") || "20")

    // Try database first
    try {
      const whereClause: any = {
        status: "AVAILABLE",
        verified: true,
        isMock: false,
      }

      // Filter by specialty if provided
      if (specialty && specialty !== "all") {
        whereClause.specialties = {
          has: specialty,
        }
      }

      // Filter by location/service area
      if (zipCode) {
        whereClause.OR = [
          { location: { contains: zipCode, mode: "insensitive" } },
          { serviceAreas: { has: zipCode } },
        ]
      } else if (location) {
        const locationTerms = buildLocationTerms(location)
        whereClause.OR = [
          ...locationTerms.map((term) => ({
            location: { contains: term, mode: "insensitive" as const },
          })),
          { serviceAreas: { hasSome: locationTerms } },
        ]
      }

      // Filter by urgent availability
      if (urgent) {
        whereClause.availableForUrgent = true
      }

      const caregivers = await prisma.caregiver.findMany({
        where: whereClause,
        take: limit,
        orderBy: [
          { rating: "desc" },
          { reviewCount: "desc" },
        ],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          specialties: true,
          yearsExperience: true,
          location: true,
          serviceAreas: true,
          languagesSpoken: true,
          hourlyRate: true,
          rating: true,
          reviewCount: true,
          bio: true,
          verified: true,
          isLicensed: true,
          isCPRCertified: true,
          isBackgroundChecked: true,
          acceptInsurance: true,
          willingToTravel: true,
          availableForUrgent: true,
        },
      })

      // Format response
      const formattedCaregivers = caregivers.map((cg) => ({
        id: cg.id,
        name: `${cg.firstName} ${cg.lastName}`,
        email: cg.email,
        phone: cg.phone,
        specialty: cg.specialties?.[0] || "General Care",
        specialties: cg.specialties || [],
        yearsExperience: cg.yearsExperience || "N/A",
        location: cg.location || "",
        serviceAreas: cg.serviceAreas || [],
        languages: cg.languagesSpoken || ["English"],
        hourlyRate: cg.hourlyRate ? Number(cg.hourlyRate) : null,
        rating: cg.rating ? Number(cg.rating) : 0,
        reviewCount: cg.reviewCount || 0,
        bio: cg.bio || "",
        verified: cg.verified,
        badges: [
          ...(cg.isLicensed ? ["Licensed"] : []),
          ...(cg.isCPRCertified ? ["CPR Certified"] : []),
          ...(cg.isBackgroundChecked ? ["Background Checked"] : []),
        ],
        acceptsInsurance: cg.acceptInsurance,
        willingToTravel: cg.willingToTravel,
        availableForUrgent: cg.availableForUrgent,
      }))

      return NextResponse.json({
        success: true,
        caregivers: formattedCaregivers,
        total: formattedCaregivers.length,
      })
    } catch (dbError) {
      logger.warn("Database query failed, returning empty results", { error: dbError })
      
      // Return empty array if database fails
      return NextResponse.json({
        success: true,
        caregivers: [],
        total: 0,
        message: "No caregivers found. Database may not be connected.",
      })
    }
  } catch (error) {
    logger.error("Caregiver search failed", { error })
    return NextResponse.json(
      { error: "Failed to search caregivers" },
      { status: 500 }
    )
  }
}
