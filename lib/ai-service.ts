import { extractJsonFromText } from "@/lib/utils"
import type { Provider } from "@/types/user"
import { searchNPIProviders } from "@/lib/npi-service"

// Enhanced natural language search function with improved accuracy
export function parseNaturalLanguageQuery(query: string): {
  condition?: string
  location?: string
  specialty?: string
  urgency?: string
  type?: string
} {
  const lowerQuery = query.toLowerCase().trim()
  const result: any = {}

  // Enhanced medical condition detection with better fuzzy matching
  const conditionKeywords: Record<string, string[]> = {
    "cancer": ["cancer", "oncology", "tumor", "malignant", "carcinoma", "neoplasm"],
    "diabetes": ["diabetes", "diabetic", "blood sugar", "glucose", "insulin", "a1c"],
    "heart": ["heart", "cardiac", "cardiovascular", "chest pain", "coronary", "cardio"],
    "alzheimer": ["alzheimer", "dementia", "memory", "cognitive", "alzheimers"],
    "asthma": ["asthma", "respiratory", "breathing", "wheezing", "bronchial"],
    "arthritis": ["arthritis", "joint pain", "rheumatoid", "osteoarthritis", "joints"],
    "depression": ["depression", "mental health", "anxiety", "mood", "depressed", "sad"],
    "obesity": ["obesity", "weight loss", "bmi", "overweight", "bariatric"],
    "hypertension": ["hypertension", "blood pressure", "high blood pressure", "bp"],
    "stroke": ["stroke", "cerebrovascular", "brain attack", "cva"],
    "kidney": ["kidney", "renal", "dialysis", "nephrology", "kidneys"],
    "liver": ["liver", "hepatic", "cirrhosis", "hepatitis", "liver disease"],
    "lung": ["lung", "pulmonary", "respiratory", "breathing", "lungs", "copd"],
    "breast": ["breast", "mammary", "mastectomy", "breast cancer"],
    "colon": ["colon", "colorectal", "bowel", "intestine", "colonoscopy"],
    "skin": ["skin", "dermatology", "dermatological", "rash", "dermatitis"],
    "eye": ["eye", "vision", "ophthalmology", "retina", "eyes", "sight"],
    "ear": ["ear", "hearing", "audiology", "otolaryngology", "ears", "ent"],
    "bone": ["bone", "orthopedic", "fracture", "osteoporosis", "bones"],
    "mental": ["mental", "psychiatry", "psychology", "therapy", "psychiatric"]
  }

  // Find condition matches with partial word matching
  for (const [condition, keywords] of Object.entries(conditionKeywords)) {
    const found = keywords.some(keyword => {
      // Exact match
      if (lowerQuery.includes(keyword)) return true
      
      // Partial match for longer keywords (min 4 chars)
      if (keyword.length >= 4) {
        const keywordStart = keyword.substring(0, Math.min(keyword.length - 1, 6))
        return lowerQuery.includes(keywordStart)
      }
      return false
    })
    
    if (found) {
      result.condition = condition
      break
    }
  }

  // Improved location detection with better patterns and fuzzy matching
  result.location = extractLocationFromQuery(query, lowerQuery)

  // Enhanced specialty detection with better matching and synonyms
  const specialtyKeywords: Record<string, string[]> = {
    "Cardiology": ["cardiologist", "heart doctor", "cardiac", "heart specialist", "cardio", "heart", "cardiovascular"],
    "Dermatology": ["dermatologist", "skin doctor", "dermatological", "skin specialist", "dermatology", "skin"],
    "Orthopedics": ["orthopedist", "bone doctor", "orthopedic", "joint doctor", "sports medicine", "ortho", "bones", "joints"],
    "Neurology": ["neurologist", "brain doctor", "neurological", "nerve doctor", "neuro", "brain", "nervous system"],
    "Psychiatry": ["psychiatrist", "mental health doctor", "psychiatric", "therapist", "psychologist", "psychiatry", "mental health"],
    "Pediatrics": ["pediatrician", "children's doctor", "pediatric", "kids doctor", "child doctor", "pediatrics", "children", "kids"],
    "Obstetrics & Gynecology": ["obstetrician", "pregnancy doctor", "obstetrical", "gynecologist", "women's health", "ob/gyn", "obgyn", "pregnancy", "womens health"],
    "Oncology": ["oncologist", "cancer doctor", "oncology", "cancer specialist", "cancer", "tumor"],
    "Endocrinology": ["endocrinologist", "diabetes doctor", "endocrine", "hormone doctor", "endocrinology", "diabetes", "hormones"],
    "Gastroenterology": ["gastroenterologist", "stomach doctor", "gastrointestinal", "digestive", "gi doctor", "gastro", "stomach", "digestive system"],
    "Urology": ["urologist", "urinary doctor", "urological", "kidney doctor", "urology", "urinary", "bladder"],
    "Ophthalmology": ["ophthalmologist", "eye doctor", "ophthalmological", "vision doctor", "retina specialist", "eye", "vision", "eyes"],
    "Otolaryngology": ["ent doctor", "ear nose throat", "otolaryngological", "ent specialist", "ent", "ear", "nose", "throat"],
    "Family Medicine": ["family doctor", "primary care", "general practitioner", "pcp", "gp", "family practice", "primary care doctor"],
    "Internal Medicine": ["internist", "internal medicine", "adult medicine", "general internal medicine", "internal", "general medicine"],
    "Pulmonology": ["pulmonologist", "lung doctor", "respiratory", "breathing doctor", "pulmonary", "lungs", "breathing"],
    "Rheumatology": ["rheumatologist", "arthritis doctor", "joint specialist", "autoimmune doctor", "rheumatology", "arthritis"],
    "Anesthesiology": ["anesthesiologist", "anesthesia doctor", "anesthesia"],
    "Emergency Medicine": ["emergency doctor", "er doctor", "urgent care", "emergency room", "emergency", "urgent"],
    "Radiology": ["radiologist", "imaging doctor", "x-ray doctor", "radiology", "imaging", "xray"],
    "Pathology": ["pathologist", "lab doctor", "pathology", "laboratory"],
    "Physical Medicine": ["physiatrist", "rehabilitation doctor", "pm&r", "rehab", "rehabilitation"],
    "Infectious Disease": ["infectious disease doctor", "infection specialist", "infectious disease", "infections"],
    "Nephrology": ["nephrologist", "kidney specialist", "nephrology", "kidney", "kidneys"],
    "Hematology": ["hematologist", "blood doctor", "blood specialist", "hematology", "blood"],
    "Allergy": ["allergist", "allergy doctor", "immunologist", "allergy", "allergies", "immunology"]
  }

  // Find specialty matches with fuzzy matching
  for (const [specialty, keywords] of Object.entries(specialtyKeywords)) {
    const found = keywords.some(keyword => {
      // Exact match
      if (lowerQuery.includes(keyword.toLowerCase())) return true
      
      // Fuzzy match for longer keywords (min 4 chars)
      if (keyword.length >= 5) {
        const keywordStart = keyword.toLowerCase().substring(0, Math.min(keyword.length - 1, 7))
        return lowerQuery.includes(keywordStart)
      }
      
      // Word boundary matching for shorter terms
      const wordBoundaryRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`)
      return wordBoundaryRegex.test(lowerQuery)
    })
    
    if (found) {
      result.specialty = specialty
      break
    }
  }

  // Extract urgency
  if (lowerQuery.includes("urgent") || lowerQuery.includes("emergency") || lowerQuery.includes("immediate")) {
    result.urgency = "urgent"
  } else if (lowerQuery.includes("routine") || lowerQuery.includes("checkup") || lowerQuery.includes("preventive")) {
    result.urgency = "routine"
  }

  // Extract type of care
  if (lowerQuery.includes("screening") || lowerQuery.includes("preventive")) {
    result.type = "screening"
  } else if (lowerQuery.includes("treatment") || lowerQuery.includes("therapy")) {
    result.type = "treatment"
  } else if (lowerQuery.includes("consultation") || lowerQuery.includes("second opinion")) {
    result.type = "consultation"
  }

  return result
}

// Enhanced location extraction with fuzzy matching and better patterns
function extractLocationFromQuery(originalQuery: string, lowerQuery: string): string | undefined {
  // Common location patterns with fuzzy matching
  const locationPatterns = [
    // ZIP codes (5 digits, optionally with +4)
    { pattern: /\b(\d{5}(?:-\d{4})?)\b/, priority: 10 },
    
    // "near me" variations
    { pattern: /\b(?:near|around|close to)\s+me\b/i, priority: 9, value: 'near me' },
    
    // City, State format with comma
    { pattern: /\b([A-Za-z\s]+),\s*([A-Z]{2}|[A-Za-z]{4,})\b/, priority: 8 },
    
    // Preposition + location (in Seattle, near Chicago, around Austin)
    { pattern: /\b(?:in|near|around|at|from)\s+([A-Za-z][A-Za-z\s]{2,20}?)(?:\s|$|,)/i, priority: 7 },
    
    // Location at end of query
    { pattern: /\b([A-Za-z][A-Za-z\s]{2,15})\s*$/i, priority: 6 },
    
    // State abbreviations
    { pattern: /\b([A-Z]{2})\b/, priority: 5 }
  ]
  
  let bestMatch = { value: '', priority: 0 }
  
  for (const { pattern, priority, value } of locationPatterns) {
    const match = originalQuery.match(pattern)
    if (match && priority > bestMatch.priority) {
      if (value) {
        bestMatch = { value, priority }
      } else if (pattern.source.includes('\\d{5}')) {
        // ZIP code match
        bestMatch = { value: match[1], priority }
      } else if (match[2]) {
        // City, State match
        bestMatch = { value: `${match[1].trim()}, ${match[2].trim()}`, priority }
      } else if (match[1]) {
        // Clean up the location string
        const location = match[1].trim()
        // Filter out common medical terms that aren't locations
        const medicalTerms = ['doctor', 'specialist', 'treatment', 'care', 'medical', 'health', 'clinic', 'hospital']
        if (!medicalTerms.some(term => location.toLowerCase().includes(term)) && location.length >= 3) {
          bestMatch = { value: location, priority }
        }
      }
    }
  }
  
  // Enhance with known city fuzzy matching
  if (bestMatch.value && bestMatch.priority < 8) {
    const enhancedLocation = enhanceLocationWithFuzzyMatch(bestMatch.value)
    if (enhancedLocation) {
      return enhancedLocation
    }
  }
  
  return bestMatch.value || undefined
}

// Fuzzy match location against known cities/states
function enhanceLocationWithFuzzyMatch(location: string): string | undefined {
  const knownLocations = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
    'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Detroit', 'Nashville',
    'Portland', 'Memphis', 'Oklahoma City', 'Las Vegas', 'Louisville', 'Baltimore',
    'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City',
    'Mesa', 'Atlanta', 'Colorado Springs', 'Raleigh', 'Omaha', 'Miami', 'Oakland',
    'Tulsa', 'Cleveland', 'Wichita', 'Arlington', 'New Orleans', 'Bakersfield',
    'Tampa', 'Honolulu', 'Anaheim', 'Aurora', 'Santa Ana', 'St Louis', 'Riverside',
    'Corpus Christi', 'Lexington', 'Pittsburgh', 'Anchorage', 'Stockton', 'Cincinnati',
    'St Paul', 'Toledo', 'Newark', 'Greensboro', 'Plano', 'Henderson', 'Lincoln',
    'Buffalo', 'Jersey City', 'Chula Vista', 'Fort Wayne', 'Orlando', 'St Petersburg',
    'Chandler', 'Laredo', 'Norfolk', 'Durham', 'Madison', 'Lubbock', 'Irvine'
  ]
  
  const lowerLocation = location.toLowerCase().trim()
  
  // Exact match (case insensitive)
  const exactMatch = knownLocations.find(city => city.toLowerCase() === lowerLocation)
  if (exactMatch) return exactMatch
  
  // Partial match (for autocomplete-like behavior)
  const partialMatch = knownLocations.find(city => 
    city.toLowerCase().startsWith(lowerLocation) && lowerLocation.length >= 3
  )
  if (partialMatch) return partialMatch
  
  // Fuzzy match for common misspellings
  const fuzzyMatch = knownLocations.find(city => {
    const cityLower = city.toLowerCase()
    // Allow 1-2 character differences for cities longer than 5 chars
    if (lowerLocation.length >= 5 && Math.abs(cityLower.length - lowerLocation.length) <= 2) {
      let differences = 0
      const minLen = Math.min(cityLower.length, lowerLocation.length)
      for (let i = 0; i < minLen; i++) {
        if (cityLower[i] !== lowerLocation[i]) differences++
        if (differences > 2) break
      }
      return differences <= 2
    }
    return false
  })
  
  return fuzzyMatch || undefined
}

export async function searchProviders(zipCode: string, specialtyOrType?: string): Promise<Provider[]> {
  try {
    // First, try to get real providers from the NPI API
    console.log("Searching for real providers via NPI API")
    const npiParams = {
      zip: zipCode,
      taxonomy_description: specialtyOrType,
      limit: 10,
    }

    const npiResponse = await searchNPIProviders(npiParams)

    // If we have NPI providers, use them
    if (npiResponse && npiResponse.results && npiResponse.results.length > 0) {
      console.log(`Found ${npiResponse.results.length} real providers from NPI API`)
      return npiResponse.results.map((p, index) => {
        // Build proper name from NPI data
        const firstName = p.basic?.first_name || ''
        const lastName = p.basic?.last_name || ''
        const orgName = (p.basic as any)?.organization_name || ''
        const credential = p.basic?.credential || 'MD'
        
        let providerName = ''
        if (orgName) {
          providerName = orgName
        } else if (firstName || lastName) {
          providerName = `Dr. ${firstName} ${lastName}`.trim()
          if (providerName === 'Dr.') providerName = `Healthcare Provider ${index + 1}`
        } else {
          providerName = `Healthcare Provider ${index + 1}`
        }
        
        const email = firstName && lastName 
          ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`
          : `provider${index + 1}@example.com`
        
        return {
        id: p.number,
        name: providerName,
        email: email,
        role: "provider" as const,
        specialty: specialtyOrType || "General Practice",
        credentials: credential ? [credential] : ["MD"],
        licenseNumber: p.number,
        licenseState: p.addresses?.[0]?.state || zipCode.substring(0, 2),
        licenseExpiration: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split("T")[0],
        education: [],
        yearsOfExperience: Math.floor(5 + Math.random() * 20),
        bio: `${providerName} is a healthcare provider specializing in ${specialtyOrType || "general medicine"}.`,
        address: {
          street: p.addresses?.[0]?.address_1 || "",
          city: p.addresses?.[0]?.city || "",
          state: p.addresses?.[0]?.state || "",
          zipCode: p.addresses?.[0]?.postal_code || zipCode,
          country: "USA",
        },
        availability: {
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          hours: {
            start: "09:00",
            end: "17:00",
          },
        },
        consultationFee: Math.floor(100 + Math.random() * 150),
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(10 + Math.random() * 90),
        isVerified: true,
        verificationStatus: "approved" as const,
        acceptedInsurance: ["Medicare", "Medicaid", "Blue Cross", "Aetna"],
        acceptedCryptocurrencies: ["BTC", "ETH", "USDC"],
        services: [specialtyOrType || "General Consultation"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "NPI" as const,
      }
      })
    }

    // If no NPI providers found, use AI to find real providers in the area
    // NOTE: This now goes through the central LLM API route which scrubs PHI
    console.log("No NPI providers found, using AI to research real providers")

    const prompt = `
      I need information about real healthcare providers near ZIP code ${zipCode}${
        specialtyOrType ? ` with specialty or type: ${specialtyOrType}` : ""
      }.
      
      Research and provide information about 5 real healthcare providers in this area. Do not invent fictional providers.
      Return the information in this JSON format:
      
      [
        {
          "id": "ai-1",
          "name": "Dr. [Real Full Name]",
          "specialty": "[Actual Specialty]",
          "credentials": ["[Real Credentials]"],
          "address": {
            "street": "[Real Street Address if known, otherwise a realistic address]",
            "city": "[Real City]",
            "state": "[Real State]",
            "zipCode": "[Real ZIP Code]"
          },
          "yearsOfExperience": [Estimated years],
          "services": ["[Real Services Offered]"]
        }
      ]
      
      Important: 
      1. Use ONLY real provider names and information you can find for this location
      2. If you cannot find specific details, you may estimate reasonable values based on available information
      3. Return ONLY the JSON array with no additional text
    `

    // Call the central LLM API route (which handles PHI scrubbing and API key management)
    // Since this is server-side code, we need to construct the full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/llm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: prompt,
        options: {
          model: "gpt-4o",
          temperature: 0.3, // Lower temperature for more factual responses
          maxTokens: 2000,
          stream: false,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`LLM API error: ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || "LLM API request failed")
    }
    
    const text = result.text || ""

    // Extract JSON from the response text
    const providersData: any = extractJsonFromText(text)

    // If we couldn't parse the JSON or it's not an array, return empty array
    if (!Array.isArray(providersData) || providersData.length === 0) {
      console.warn("Failed to parse provider data from AI response")
      return []
    }

    // Convert to Provider type and add additional fields
    return providersData.map((p: any, index: number) => ({
      id: p.id || `ai-${index + 1}`,
      name: p.name || `Dr. Unknown`,
      email: `${p.name?.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
      role: "provider" as const,
      specialty: p.specialty || specialtyOrType || "General Practice",
      credentials: p.credentials || ["MD"],
      licenseNumber: `LIC${Math.floor(10000 + Math.random() * 90000)}`,
      licenseState: p.address?.state || zipCode.substring(0, 2),
      licenseExpiration: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split("T")[0],
      education: [],
      yearsOfExperience: p.yearsOfExperience || Math.floor(5 + Math.random() * 20),
      bio:
        p.bio ||
        `${p.name} is a healthcare provider specializing in ${p.specialty || specialtyOrType || "general medicine"}.`,
      address: {
        street: p.address?.street || "",
        city: p.address?.city || "",
        state: p.address?.state || "",
        zipCode: p.address?.zipCode || zipCode,
        country: "USA",
      },
      availability: {
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        hours: {
          start: "09:00",
          end: "17:00",
        },
      },
      consultationFee: p.consultationFee || Math.floor(100 + Math.random() * 150),
      rating: p.rating || 3.5 + Math.random() * 1.5,
      reviewCount: p.reviewCount || Math.floor(10 + Math.random() * 90),
      isVerified: true,
      verificationStatus: "approved" as const,
      acceptedInsurance: p.acceptedInsurance || ["Medicare", "Medicaid", "Blue Cross", "Aetna"],
      acceptedCryptocurrencies: ["BTC", "ETH", "USDC"],
      services: p.services || [p.specialty || specialtyOrType || "General Consultation"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "AI" as const,
    }))
  } catch (error) {
    console.error("Error finding providers nearby:", error)
    return []
  }
}

export async function getProviderRecommendations(patientNeeds: string, zipCode: string): Promise<Provider[]> {
  // Extract specialty from patient needs
  const specialtyKeywords = [
    "family",
    "internal",
    "pediatric",
    "cardio",
    "heart",
    "dermatol",
    "skin",
    "neuro",
    "brain",
    "psych",
    "mental",
    "orthoped",
    "bone",
    "gynecol",
    "women",
  ]

  const patientNeedsLower = patientNeeds.toLowerCase()
  const detectedSpecialties = specialtyKeywords
    .filter((keyword) => patientNeedsLower.includes(keyword))
    .map((keyword) => {
      switch (keyword) {
        case "family":
          return "Family Medicine"
        case "internal":
          return "Internal Medicine"
        case "pediatric":
          return "Pediatrics"
        case "cardio":
        case "heart":
          return "Cardiology"
        case "dermatol":
        case "skin":
          return "Dermatology"
        case "neuro":
        case "brain":
          return "Neurology"
        case "psych":
        case "mental":
          return "Psychiatry"
        case "orthoped":
        case "bone":
          return "Orthopedics"
        case "gynecol":
        case "women":
          return "Obstetrics & Gynecology"
        default:
          return ""
      }
    })
    .filter((s) => s !== "")

  const specialty = detectedSpecialties.length > 0 ? detectedSpecialties[0] : undefined

  return searchProviders(zipCode, specialty)
}
