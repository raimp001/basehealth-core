// NPI (National Provider Identifier) API integration for real provider data
export interface NPIProvider {
  number: string // NPI number
  enumeration_type: string
  created_epoch: string
  last_updated_epoch: string
  addresses: Array<{
    address_1: string
    address_2?: string
    city: string
    state: string
    postal_code: string
    country_code: string
    country_name: string
    address_type: string
    address_purpose: string
    telephone_number?: string
    fax_number?: string
  }>
  taxonomies: Array<{
    code: string
    taxonomy_group?: string
    desc: string
    primary: boolean
    state?: string
    license?: string
  }>
  identifiers?: Array<{
    code: string
    desc: string
    identifier: string
    state?: string
  }>
  endpoints?: Array<{
    endpoint: string
    endpointType: string
    endpointTypeDescription: string
    endpointDescription?: string
    affiliation?: string
    use?: string
    useDescription?: string
    contentType?: string
    contentTypeDescription?: string
    contentOtherDescription?: string
    country_code?: string
    country_name?: string
    address_type?: string
    address_1?: string
    city?: string
    state?: string
    postal_code?: string
  }>
  basic?: {
    status: string
    credential?: string
    first_name?: string
    last_name?: string
    middle_name?: string
    name?: string
    sex?: string // Changed from gender to sex
    enumeration_date?: string
    last_updated?: string
    certification_date?: string
    name_prefix?: string
    name_suffix?: string
    sole_proprietor?: string
    organization_name?: string
    organizational_subpart?: string
    authorized_official_credential?: string
    authorized_official_first_name?: string
    authorized_official_last_name?: string
    authorized_official_middle_name?: string
    authorized_official_name_prefix?: string
    authorized_official_name_suffix?: string
    authorized_official_telephone_number?: string
    authorized_official_title_or_position?: string
  }
  practiceLocations?: Array<{
    country_code: string
    country_name: string
    address_purpose: string
    address_type: string
    address_1: string
    address_2?: string
    city: string
    state: string
    postal_code: string
    telephone_number?: string
    fax_number?: string
  }>
  other_names?: Array<any>
}

export interface NPISearchParams {
  first_name?: string
  last_name?: string
  organization_name?: string
  address_purpose?: string
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  limit?: number
  skip?: number
  taxonomy_description?: string
  enumeration_type?: string
}

export interface NPISearchResponse {
  result_count: number
  results: NPIProvider[]
}

// Common medical specialties for search
export const medicalSpecialties = {
  'Primary Care': [
    'Family Medicine',
    'Internal Medicine', 
    'General Practice',
    'Pediatrics'
  ],
  'Cardiology': [
    'Cardiovascular Disease (Internal Medicine)',
    'Interventional Cardiology',
    'Cardiac Electrophysiology',
    'Cardiovascular Disease'
  ],
  'Dermatology': [
    'Dermatology',
    'Dermatopathology',
    'Pediatric Dermatology'
  ],
  'Endocrinology': [
    'Endocrinology, Diabetes & Metabolism',
    'Pediatric Endocrinology'
  ],
  'Gastroenterology': [
    'Gastroenterology',
    'Pediatric Gastroenterology'
  ],
  'Neurology': [
    'Neurology',
    'Child Neurology',
    'Neuromuscular Medicine'
  ],
  'Oncology': [
    'Hematology & Oncology',
    'Medical Oncology',
    'Radiation Oncology'
  ],
  'Orthopedics': [
    'Orthopaedic Surgery',
    'Hand Surgery',
    'Sports Medicine'
  ],
  'Psychiatry': [
    'Psychiatry & Neurology',
    'Child & Adolescent Psychiatry',
    'Addiction Medicine'
  ],
  'Radiology': [
    'Diagnostic Radiology',
    'Nuclear Medicine',
    'Radiation Oncology'
  ],
  'Surgery': [
    'General Surgery',
    'Plastic Surgery',
    'Thoracic Surgery'
  ]
}

// Search providers using NPI Registry API
export async function searchProviders(params: NPISearchParams): Promise<NPISearchResponse> {
  const baseUrl = 'https://npiregistry.cms.hhs.gov/api/'
  const searchParams = new URLSearchParams()
  
  // Add required version parameter
  searchParams.append('version', '2.1')
  
  // Add search parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString())
    }
  })
  
  // Default parameters
  if (!params.limit) {
    searchParams.append('limit', '20')
  }
  if (!params.enumeration_type) {
    searchParams.append('enumeration_type', 'NPI-1') // Individual providers
  }
  
  const url = `${baseUrl}?${searchParams.toString()}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BaseHealth Provider Search'
      }
    })
    
    if (!response.ok) {
      throw new Error(`NPI API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
    
  } catch (error) {
    console.error('Error searching providers:', error)
    throw error
  }
}

// Search providers by specialty and location
export async function searchProvidersBySpecialty(
  specialty: string, 
  city?: string, 
  state?: string,
  limit: number = 20
): Promise<NPIProvider[]> {
  try {
    // Get taxonomy descriptions for the specialty
    const taxonomyDescriptions = medicalSpecialties[specialty as keyof typeof medicalSpecialties] || [specialty]
    
    // Search for each taxonomy description
    const allResults: NPIProvider[] = []
    
    for (const taxonomyDesc of taxonomyDescriptions) {
      const searchParams: NPISearchParams = {
        taxonomy_description: taxonomyDesc,
        enumeration_type: 'NPI-1',
        limit: Math.ceil(limit / taxonomyDescriptions.length),
        city,
        state
      }
      
      const response = await searchProviders(searchParams)
      
      // Handle different response structures
      if (response && response.results && Array.isArray(response.results)) {
        allResults.push(...response.results)
      } else if (response && Array.isArray(response)) {
        allResults.push(...response)
      } else if (response && (response as any).Errors) {
        console.warn(`NPI API Error for taxonomy "${taxonomyDesc}":`, (response as any).Errors)
        // Continue to next taxonomy instead of failing completely
        continue
      } else {
        console.warn('Unexpected NPI API response structure:', response)
      }
      
      // Break if we have enough results
      if (allResults.length >= limit) {
        break
      }
    }
    
    // If no results found with specific taxonomies, try a broader search
    if (allResults.length === 0) {
      console.log(`No results with specific taxonomies, trying broader search for specialty: ${specialty}`)
      const broadSearchParams: NPISearchParams = {
        enumeration_type: 'NPI-1',
        limit: limit,
        city,
        state
      }
      
      const broadResponse = await searchProviders(broadSearchParams)
      if (broadResponse && broadResponse.results && Array.isArray(broadResponse.results)) {
        // Filter results by specialty in the name or other fields
        const filtered = broadResponse.results.filter(provider => {
          const specialtyLower = specialty.toLowerCase()
          return provider.taxonomies?.some(tax => 
            tax.desc?.toLowerCase().includes(specialtyLower) ||
            tax.desc?.toLowerCase().includes(specialtyLower.split(' ')[0])
          )
        })
        allResults.push(...filtered.slice(0, limit))
      }
    }
    
    // Remove duplicates and limit results
    const uniqueResults = allResults.filter((provider, index, self) => 
      index === self.findIndex(p => p.number === provider.number)
    )
    
    return uniqueResults.slice(0, limit)
    
  } catch (error) {
    console.error('Error searching providers by specialty:', error)
    return []
  }
}

// Format provider name for display
export function formatProviderName(provider: NPIProvider): string {
  // Check for organization name first
  if (provider.basic?.organization_name && provider.basic.organization_name.trim()) {
    return provider.basic.organization_name.trim()
  }
  
  // Build individual provider name
  const firstName = provider.basic?.first_name?.trim() || ''
  const middleName = provider.basic?.middle_name?.trim() || ''
  const lastName = provider.basic?.last_name?.trim() || ''
  const namePrefix = provider.basic?.name_prefix?.trim() || ''
  const nameSuffix = provider.basic?.name_suffix?.trim() || ''
  const credential = provider.basic?.credential?.trim() || ''
  
  // If we have at least a first or last name, construct the name
  if (firstName || lastName) {
    const nameParts = []
    
    // Add prefix like "Dr." if present
    if (namePrefix) nameParts.push(namePrefix)
    
    // Add first name
    if (firstName) nameParts.push(firstName)
    
    // Add middle name (or initial)
    if (middleName) nameParts.push(middleName)
    
    // Add last name
    if (lastName) nameParts.push(lastName)
    
    // Add suffix like "Jr." if present
    if (nameSuffix) nameParts.push(nameSuffix)
    
    // Add credential like "MD" or "DO"
    if (credential) nameParts.push(credential)
    
    const fullName = nameParts.join(' ')
    
    // If we have a valid name, return it
    if (fullName.length > 2) {
      return fullName
    }
  }
  
  // Fallback: try to use the credential alone
  if (credential) {
    return `Healthcare Provider (${credential})`
  }
  
  return 'Healthcare Provider'
}

// Get primary address for provider
export function getProviderAddress(provider: NPIProvider): string {
  const primaryAddress = provider.addresses?.find(addr => 
    addr.address_purpose === 'LOCATION' || addr.address_purpose === 'MAILING'
  ) || provider.addresses?.[0]
  
  if (!primaryAddress) return 'Address not available'
  
  const parts = [
    primaryAddress.address_1,
    primaryAddress.city,
    primaryAddress.state,
    primaryAddress.postal_code
  ].filter(Boolean)
  
  return parts.join(', ')
}

// Get primary specialty for provider
export function getProviderSpecialty(provider: NPIProvider): string {
  const primaryTaxonomy = provider.taxonomies?.find(tax => tax.primary) || provider.taxonomies?.[0]
  return primaryTaxonomy?.desc || 'General Practice'
}

// Check if provider is accepting new patients (this would need additional data source)
export function isAcceptingPatients(provider: NPIProvider): boolean {
  // The NPI registry does not include availability/accepting-new-patients.
  // Return false by default to avoid presenting guessed data as fact.
  void provider
  return false
} 
