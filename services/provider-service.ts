import type { Provider } from "@/types/user"
import { searchProviders as searchProvidersFromLib } from "@/lib/provider-search-service"

/**
 * Find available providers based on various criteria
 * @param specialty Optional specialty to filter by
 * @param isAvailableNow Whether to only return providers available now
 * @param maxDistance Maximum distance in miles
 * @param latitude Optional latitude for location-based search
 * @param longitude Optional longitude for location-based search
 * @returns Promise resolving to an array of providers
 */
export async function findAvailableProviders(
  specialty?: string,
  isAvailableNow?: boolean,
  maxDistance?: number,
  latitude?: number,
  longitude?: number,
): Promise<Provider[]> {
  try {
    // Get coordinates if provided
    const coordinates = latitude && longitude ? { latitude, longitude } : undefined

    // Search for providers using the provider search service
    const providers = await searchProvidersFromLib({
      specialty,
      coordinates,
      radius: maxDistance,
    })

    // Filter by availability if requested
    if (isAvailableNow) {
      const now = new Date()
      const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()]
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`

      return providers.filter((provider) => {
        const av = provider.availability
        // Skip string-form availability (legacy/free-form)
        if (typeof av === "string" || !av) return true
        // Check if provider is available on this day
        if (!av.days?.includes(day)) {
          return false
        }

        // Check if provider is available at this time
        const startTime = av.hours?.start
        const endTime = av.hours?.end
        if (!startTime || !endTime) return true

        return time >= startTime && time <= endTime
      })
    }

    return providers
  } catch (error) {
    console.error("Error finding available providers:", error)
    return []
  }
}

/**
 * Update provider information
 * @param providerId Provider ID
 * @param data Partial provider data to update
 * @returns Promise resolving to the updated provider or null if update fails
 */
export async function updateProvider(providerId: string, data: Partial<Provider>): Promise<Provider | null> {
  try {
    const response = await fetch(`/api/providers/${providerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to update provider: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    return result.provider
  } catch (error) {
    console.error("Error updating provider:", error)
    return null
  }
}

/**
 * Get provider by ID
 * @param providerId Provider ID
 * @returns Promise resolving to the provider or null if not found
 */
export async function getProviderById(providerId: string): Promise<Provider | null> {
  try {
    const response = await fetch(`/api/providers/${providerId}`)

    if (!response.ok) {
      throw new Error(`Failed to get provider: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.provider
  } catch (error) {
    console.error("Error getting provider:", error)
    return null
  }
}

/**
 * Get provider reviews
 * @param providerId Provider ID
 * @returns Promise resolving to the provider reviews
 */
export async function getProviderReviews(providerId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/providers/${providerId}/reviews`)

    if (!response.ok) {
      throw new Error(`Failed to get provider reviews: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.reviews
  } catch (error) {
    console.error("Error getting provider reviews:", error)
    return []
  }
}
