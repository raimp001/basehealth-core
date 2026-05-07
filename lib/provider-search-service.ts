import type { Provider } from "@/types/user"
import npiService from "@/lib/npi-service"
import { searchNPIProviders } from "@/lib/npi-service"
import { prisma } from "@/lib/prisma"

/**
 * Get provider by ID
 * @param providerId Provider ID (can be database ID, NPI number, or npi-prefixed)
 * @returns Promise resolving to the provider or null if not found
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  // 1. First, try to get from Prisma database (real registered providers)
  try {
    const dbProvider = await prisma.provider.findFirst({
      where: {
        OR: [
          { id: providerId },
          { npiNumber: providerId },
          { userId: providerId },
        ],
      },
      include: {
        user: true,
      },
    })

    if (dbProvider) {
      // Get specialty from specialties array
      const specialty = dbProvider.specialties?.[0] || 'General Practice'
      
      return {
        id: dbProvider.id,
        name: dbProvider.fullName || dbProvider.user?.name || 'Provider',
        email: dbProvider.email || dbProvider.user?.email || '',
        role: 'provider',
        specialty: specialty,
        credentials: dbProvider.professionType ? [dbProvider.professionType] : [],
        licenseNumber: dbProvider.licenseNumber || '',
        licenseState: dbProvider.licenseState || '',
        licenseExpiration: dbProvider.licenseExpiry?.toISOString().split('T')[0] || '',
        education: [],
        yearsOfExperience: 0,
        bio: dbProvider.bio || '',
        address: {
          street: dbProvider.location || '',
          city: '',
          state: dbProvider.licenseState || '',
          zipCode: '',
          country: dbProvider.country || 'USA',
        },
        availability: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          hours: { start: '09:00', end: '17:00' },
        },
        consultationFee: 0,
        rating: dbProvider.rating ? Number(dbProvider.rating) : 0,
        reviewCount: dbProvider.reviewCount || 0,
        isVerified: dbProvider.isVerified || false,
        verificationStatus: dbProvider.status === 'APPROVED' ? 'approved' : 'pending',
        acceptedInsurance: [],
        acceptedCryptocurrencies: ['USDC', 'ETH'],
        services: dbProvider.specialties || [],
        npiNumber: dbProvider.npiNumber || undefined,
        createdAt: dbProvider.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: dbProvider.updatedAt?.toISOString() || new Date().toISOString(),
      }
    }
  } catch (error) {
    // Prisma might not be connected, continue to other sources
    console.log("Prisma lookup failed, trying other sources:", error)
  }

  // 2. Try NPI registry lookup
  try {
    // Handle both "npi-XXXXXXXX" format and raw NPI numbers
    let npiNumber = providerId
    if (providerId.startsWith("npi-")) {
      npiNumber = providerId.substring(4)
    }
    
    // Check if it looks like an NPI number (10 digits)
    if (/^\d{10}$/.test(npiNumber)) {
      const npiProvider = await npiService.getProviderByNPI(npiNumber)
      if (npiProvider) {
        return npiService.convertToAppProvider(npiProvider)
      }
    }
  } catch (error) {
    console.error("Error getting provider from NPI database:", error)
  }

  return null
}

export async function searchProviders(options: {
  zipCode?: string
  specialty?: string
  coordinates?: { latitude: number; longitude: number }
  radius?: number
  location?: string
  providerType?: string
  useNPI?: boolean
  useAI?: boolean
  query?: string
}): Promise<Provider[]> {
  const results: Provider[] = []
  void options.coordinates
  void options.radius
  
  // 1. First, search registered providers in database
  try {
    const dbProviders = await prisma.provider.findMany({
      where: {
        isVerified: true,
        status: 'APPROVED',
        ...(options.specialty && {
          specialties: {
            has: options.specialty,
          },
        }),
      },
      include: {
        user: true,
      },
      take: 20,
    })
    
    for (const dbProvider of dbProviders) {
      const specialty = dbProvider.specialties?.[0] || 'General Practice'
      
      results.push({
        id: dbProvider.id,
        name: dbProvider.fullName || dbProvider.user?.name || 'Provider',
        email: dbProvider.email || dbProvider.user?.email || '',
        role: 'provider',
        specialty: specialty,
        credentials: dbProvider.professionType ? [dbProvider.professionType] : [],
        licenseNumber: dbProvider.licenseNumber || '',
        licenseState: dbProvider.licenseState || '',
        licenseExpiration: dbProvider.licenseExpiry?.toISOString().split('T')[0] || '',
        education: [],
        yearsOfExperience: 0,
        bio: dbProvider.bio || '',
        address: {
          street: dbProvider.location || '',
          city: '',
          state: dbProvider.licenseState || '',
          zipCode: '',
          country: dbProvider.country || 'USA',
        },
        availability: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          hours: { start: '09:00', end: '17:00' },
        },
        consultationFee: 0,
        rating: dbProvider.rating ? Number(dbProvider.rating) : 0,
        reviewCount: dbProvider.reviewCount || 0,
        isVerified: dbProvider.isVerified || false,
        verificationStatus: dbProvider.status === 'APPROVED' ? 'approved' : 'pending',
        acceptedInsurance: [],
        acceptedCryptocurrencies: ['USDC', 'ETH'],
        services: dbProvider.specialties || [],
        createdAt: dbProvider.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: dbProvider.updatedAt?.toISOString() || new Date().toISOString(),
      })
    }
  } catch (error) {
    console.log("Database search failed:", error)
  }
  
  // 2. Also search NPI registry (real registry data only)
  try {
    const npiResponse = await searchNPIProviders({
      zip: options.zipCode,
      taxonomy_description: options.specialty,
      limit: 20,
    })
    const npiResults = (npiResponse.results || []).map((provider) => npiService.convertToAppProvider(provider))
    results.push(...npiResults)
  } catch (error) {
    console.log("NPI search failed:", error)
  }
  
  // Deduplicate by ID
  const uniqueResults = results.filter((provider, index, self) =>
    index === self.findIndex((p) => p.id === provider.id)
  )
  
  return uniqueResults
}
