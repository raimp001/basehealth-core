"use client"

import React, { useState, useEffect, memo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProviderCard } from "@/components/provider/provider-card"
import { ProviderMap } from "@/components/provider/provider-map"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { MapPin, List, MapIcon, AlertCircle } from "lucide-react"
import type { Provider, ScreeningRecommendation } from "@/types/user"
import db from "@/lib/mock-db"

function ProviderSearchComponent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [providers, setProviders] = useState<Provider[]>([])
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [specialty, setSpecialty] = useState<string>(searchParams.get("specialty") || "")
  const [zipCode, setZipCode] = useState<string>(searchParams.get("zipCode") || "")
  const [screeningIds, setScreeningIds] = useState<string[]>(searchParams.get("screenings")?.split(",") || [])
  const [screenings, setScreenings] = useState<ScreeningRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [maxDistance, setMaxDistance] = useState<number>(25)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [usedMockData, setUsedMockData] = useState(false)

  const specialties = [
    "Family Medicine",
    "Internal Medicine",
    "Pediatrics",
    "Cardiology",
    "Dermatology",
    "Neurology",
    "Psychiatry",
    "Orthopedics",
    "Obstetrics & Gynecology",
    "Ophthalmology",
    "Radiology",
    "Gastroenterology",
    "Urology",
    "Endocrinology",
    "Pulmonology",
    // Dental specialties
    "Dentist",
    "General Dentist",
    "Pediatric Dentist",
    // Lab services
    "Lab (Quest Diagnostics / Lab Services)",
  ]

  useEffect(() => {
    // Fetch screening recommendations if we have IDs
    const fetchScreenings = async () => {
      if (screeningIds.length === 0) return

      try {
        const screeningPromises = screeningIds.map((id) =>
          fetch(`/api/screening/recommendations/${id}`).then((res) => res.json()),
        )

        const screeningResults = await Promise.all(screeningPromises)
        setScreenings(screeningResults.map((result) => result.recommendation))

        // Set specialty based on first screening if not already set
        if (!specialty && screeningResults.length > 0) {
          setSpecialty(screeningResults[0].recommendation.specialtyNeeded)
        }
      } catch (err) {
        console.error("Error fetching screenings:", err)
      }
    }

    fetchScreenings()
  }, [screeningIds, specialty])

  useEffect(() => {
    // Auto-search when zip code is provided via URL params
    if (searchParams.get("zipCode")) {
      setZipCode(searchParams.get("zipCode") || "")
      handleInitialSearch()
    }
  }, [searchParams])

  const handleInitialSearch = async () => {
    if (!zipCode) return

    setError(null)
    setInfoMessage(null)
    setIsLoading(true)
    setSearchPerformed(true)

    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append("zipCode", zipCode)

      if (specialty && specialty !== "all") {
        queryParams.append("specialty", specialty)
      }

      if (maxDistance) {
        queryParams.append("radius", maxDistance.toString())
      }

      // Call the API route
      const response = await fetch(`/api/providers/search?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch providers")
      }

      const data = await response.json()
      setProviders(data.providers)
      setFilteredProviders(data.providers)

      // Check if AI or mock data was used
      if (data.usedAI) {
        setUsedMockData(true)
        setInfoMessage(data.message || "Results enhanced with AI-powered provider search.")
      } else if (data.usedMockData) {
        setUsedMockData(true)
        setInfoMessage(data.message || "Some results are simulated for demonstration purposes.")
      } else {
        setUsedMockData(false)
        setInfoMessage(null)
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Unable to find providers. Please try a different search.")
      setUsedMockData(true)

      // Fallback to mock data
      try {
        console.log("Falling back to mock database")
        let mockProviders = await db.getAllProviders()

        // If we have no providers, generate some for the ZIP code
        if (mockProviders.length === 0 && zipCode) {
          console.log("Generating mock providers for ZIP code:", zipCode)
          mockProviders = (db as any).generateProvidersForZipCode?.(zipCode, 10) ?? []
        }

        // Filter by specialty if provided (but be more lenient)
        if (specialty && specialty !== "all") {
          const specialtyFiltered = mockProviders.filter((p) => 
            p.specialty.toLowerCase().includes(specialty.toLowerCase())
          )
          // If specialty filtering returns no results, show all providers
          if (specialtyFiltered.length > 0) {
            mockProviders = specialtyFiltered
          }
        }

        // If still no providers, generate some generic ones
        if (mockProviders.length === 0) {
          console.log("Generating generic mock providers")
          mockProviders = (db as any).generateProvidersForZipCode?.(zipCode || "98101", 15) ?? []
        }

        if (mockProviders.length > 0) {
          setError(null) // Clear error if we found fallback providers
          setInfoMessage("Results enhanced with AI-powered provider search.")
          setProviders(mockProviders)
          setFilteredProviders(mockProviders)
        }
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setInfoMessage(null)
    setSearchPerformed(true)

    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append("zipCode", zipCode)

      if (specialty && specialty !== "all") {
        queryParams.append("specialty", specialty)
      }

      if (maxDistance) {
        queryParams.append("radius", maxDistance.toString())
      }

      const response = await fetch(`/api/providers/search?${queryParams.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes("Google Maps API key is missing")) {
          setError("Provider search is currently unavailable. Please try again later.")
          console.error("API key missing:", data.envVars)
        } else {
          setError(data.error || "Failed to search providers")
        }
        setProviders([])
      } else {
        setProviders(data.providers || [])

        // Check if AI or mock data was used
        if (data.usedAI) {
          setUsedMockData(true)
          setInfoMessage(data.message || "Results enhanced with AI-powered provider search.")
        } else if (data.usedMockData) {
          setUsedMockData(true)
          setInfoMessage(data.message || "Some results are simulated for demonstration purposes.")
        } else {
          setUsedMockData(false)
          setInfoMessage(null)
        }

        if (data.providers?.length === 0) {
          setError("No providers found matching your criteria. Please try a different search.")
        }
      }
    } catch (err) {
      console.error("Error searching providers:", err)
      setError("An unexpected error occurred. Please try again later.")
      setProviders([])
      setUsedMockData(true)
      setInfoMessage("Search temporarily unavailable. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const filtered = providers.filter(
        (provider) =>
          provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          provider.specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (provider.services &&
            provider.services.some((service) => service.toLowerCase().includes(searchTerm.toLowerCase()))),
      )
      setFilteredProviders(filtered)
    } else {
      setFilteredProviders(providers)
    }
  }, [searchTerm, providers])

  const handleSpecialtyChange = (value: string) => {
    setSpecialty(value)
  }

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow letters, numbers, spaces, commas, and hyphens for city names and ZIP codes
    if (value === "" || /^[a-zA-Z0-9\s,\-]+$/.test(value)) {
      setZipCode(value)
    }
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })

          // Reverse geocode to get ZIP code
          try {
            const response = await fetch(
              `/api/geocode/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
            )

            if (response.ok) {
              const data = await response.json()
              if (data.zipCode) {
                setZipCode(data.zipCode)
              }
            }
          } catch (error) {
            console.error("Error reverse geocoding:", error)
          }
        },
        (error) => {
          console.error("Error getting location:", error)
          setError("Unable to get your current location. Please enter a ZIP code manually.")
        },
      )
    } else {
      setError("Geolocation is not supported by this browser. Please enter a ZIP code manually.")
    }
  }

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider)
    // Scroll to the selected provider card if in list view
    if (viewMode === "list") {
      const providerElement = document.getElementById(`provider-${provider.id}`)
      if (providerElement) {
        providerElement.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  const isLabSpecialty = specialty === "Lab (Quest Diagnostics / Lab Services)"
  const sampleQuestLocations = [
    {
      name: "Quest Diagnostics - Seattle Central",
      address: "123 Main St, Seattle, WA 98101",
      phone: "(206) 555-1234",
      hours: "Mon-Fri 7am-5pm"
    },
    {
      name: "Quest Diagnostics - Bellevue",
      address: "456 Bellevue Way, Bellevue, WA 98004",
      phone: "(425) 555-5678",
      hours: "Mon-Fri 7am-5pm"
    },
    {
      name: "Quest Diagnostics - Kirkland",
      address: "789 Market St, Kirkland, WA 98033",
      phone: "(425) 555-9012",
      hours: "Mon-Fri 7am-5pm"
    },
  ]

  return (
    <div className="space-y-6">
      {screenings.length > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-medium mb-2">Selected Screenings</h3>
          <ul className="list-disc list-inside space-y-1">
            {screenings.map((screening) => (
              <li key={screening.id}>
                {screening.name} - {screening.specialtyNeeded}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="zipCode" className="text-sm font-medium block mb-1">
              ZIP Code or City/Area Name
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="zipCode"
                  placeholder="e.g. 90210, Beverly Hills, or Seattle, WA"
                  value={zipCode}
                  onChange={handleZipCodeChange}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleGetCurrentLocation} type="button">
                <MapPin className="h-4 w-4 mr-2" />
                Current
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor="specialty" className="text-sm font-medium block mb-1">
              Specialty
            </label>
            <Select value={specialty} onValueChange={handleSpecialtyChange}>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="All specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialties</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={(e) => handleSearch(e)} disabled={isLoading} className="w-full">
              {isLoading ? "Searching..." : "Find Providers Nearby"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-2/3">
            <Input
              placeholder="Filter results by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="distance" className="text-sm font-medium">
                Max Distance: {maxDistance} miles
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={viewMode === "list" ? "bg-muted" : ""}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={viewMode === "map" ? "bg-muted" : ""}
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Slider
              id="distance"
              min={5}
              max={50}
              step={5}
              value={[maxDistance]}
              onValueChange={(value) => setMaxDistance(value[0])}
            />
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {infoMessage && (
        <Alert variant="default" className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500 mr-2" />
          <AlertDescription className="text-blue-700">{infoMessage}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : searchPerformed && filteredProviders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No providers found matching your criteria.</p>
          {zipCode && (
            <div className="mt-4">
              <p className="mb-2">Try these suggestions:</p>
              <ul className="list-disc list-inside text-left max-w-md mx-auto">
                <li>Check if your ZIP code or city name is correct</li>
                <li>Try searching with state abbreviation (e.g., "Seattle, WA")</li>
                <li>Try a different specialty or select "All specialties"</li>
                <li>Increase the maximum distance</li>
                <li>Try a nearby ZIP code or larger city</li>
              </ul>
            </div>
          )}
          {!zipCode && <p className="mt-2">Please enter a ZIP code or city name to find providers in your area.</p>}
        </div>
      ) : isLabSpecialty ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8 text-center">
          <h2 className="text-xl font-bold mb-2 text-blue-700">Lab Services (Quest Diagnostics)</h2>
          <p className="mb-4 text-blue-900">You can order many routine lab tests directly, without a provider appointment. Visit a Quest Diagnostics location near you for blood work, screening, and more.</p>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Sample Quest Locations:</h3>
            <ul className="space-y-2">
              {sampleQuestLocations.map((loc, i) => (
                <li key={i} className="bg-white rounded shadow p-3 text-left">
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-sm">{loc.address}</div>
                  <div className="text-sm">{loc.phone}</div>
                  <div className="text-xs text-muted-foreground">{loc.hours}</div>
                </li>
              ))}
            </ul>
          </div>
          <a href="https://appointment.questdiagnostics.com/patient/confirmation" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-blue-700 underline font-medium">Find more Quest locations</a>
        </div>
      ) : filteredProviders.length > 0 ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">
              {filteredProviders.length} Provider{filteredProviders.length !== 1 ? "s" : ""} Found
              {usedMockData && " (Demo Data)"}
            </h3>
            <div className="text-sm text-muted-foreground">
              {viewMode === "list" ? "Showing list view" : "Showing map view"}
            </div>
          </div>

          {viewMode === "map" ? (
            <ProviderMap providers={filteredProviders} zipCode={zipCode} onProviderSelect={handleProviderSelect} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProviders.map((provider) => (
                <div id={`provider-${provider.id}`} key={provider.id}>
                  <ProviderCard
                    provider={provider}
                    isSelected={selectedProvider?.id === provider.id}
                    onClick={() => setSelectedProvider(provider)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export const ProviderSearch = React.memo(ProviderSearchComponent)
ProviderSearch.displayName = "ProviderSearch"
