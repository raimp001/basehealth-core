"use client"

/**
 * Provider Search - Enhanced Location/ZIP Support
 */

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search, MapPin, Star, X, ArrowRight, Loader2, Navigation, AlertCircle, BadgeCheck, Phone, ExternalLink } from "lucide-react"
import { CareHandoffBanner } from "@/components/care-handoff-banner"

export const dynamic = 'force-dynamic'

interface Provider {
  npi: string
  name: string
  specialty: string
  address: string
  city: string
  state: string
  zip: string
  distance: number | null
  rating: number | null
  reviewCount: number | null
  acceptingPatients: boolean | null
  phone: string
  credentials: string
  source?: 'basehealth' | 'npi_registry' | 'google_places'
  isVerified?: boolean
  hasCalendar?: boolean
}

// Common locations for quick access
const QUICK_LOCATIONS = [
  { label: 'Portland, OR', value: 'Portland, Oregon' },
  { label: 'Seattle, WA', value: 'Seattle, Washington' },
  { label: 'San Francisco, CA', value: 'San Francisco, California' },
  { label: 'Los Angeles, CA', value: 'Los Angeles, California' },
  { label: 'New York, NY', value: 'New York, New York' },
  { label: 'Chicago, IL', value: 'Chicago, Illinois' },
]

// Common specialties for quick access
const QUICK_SPECIALTIES = [
  'Primary Care',
  'Family Medicine',
  'Internal Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
]

function SearchPageContent() {
  const searchParams = useSearchParams()
  // Accept both ?query= (legacy) and ?q= (chat handoff)
  const initialQuery = searchParams?.get('query') || searchParams?.get('q') || ''
  const initialLocation = searchParams?.get('location') || ''
  
  const [specialty, setSpecialty] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (initialQuery || initialLocation) {
      searchProviders(initialQuery, initialLocation)
    }
  }, [initialQuery, initialLocation])

  // Detect user location
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get city/state
          const response = await fetch(
            `/api/geocode/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          )
          if (response.ok) {
            const data = await response.json()
            if (data.city && data.state) {
              const loc = `${data.city}, ${data.state}`
              setLocation(loc)
              setDetectedLocation(loc)
            }
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err)
        } finally {
          setIsLocating(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setIsLocating(false)
      },
      { timeout: 10000 }
    )
  }

  // Check if input is a ZIP code
  const isZipCode = (input: string) => /^\d{5}(-\d{4})?$/.test(input.trim())

  const searchProviders = async (specialtyQuery: string, locationQuery: string) => {
    if (!specialtyQuery.trim() && !locationQuery.trim()) {
      setError('Please enter a specialty or location')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      
      // Build query - combine specialty with location for natural language processing
      let query = ''
      if (specialtyQuery.trim()) {
        query = specialtyQuery.trim()
      }
      
      // Add location to query if provided
      if (locationQuery.trim()) {
        if (isZipCode(locationQuery)) {
          // If it's a ZIP code, add as separate parameter
          params.set('zipCode', locationQuery.trim())
          params.set('location', locationQuery.trim())
        } else {
          // Add location to natural language query
          if (query) {
            query += ` in ${locationQuery.trim()}`
          } else {
            query = `doctor in ${locationQuery.trim()}`
          }
          params.set('location', locationQuery.trim())
        }
      }
      
      if (query) {
        params.set('query', query)
      }
      params.set('limit', '20')

      const response = await fetch(`/api/providers/search?${params.toString()}`)
      
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      
      if (data.success) {
        setProviders(data.providers || [])
        if (data.providers.length === 0) {
          setError(`No providers found${locationQuery ? ` in ${locationQuery}` : ''}. Try a different search or broader location.`)
        }
      } else {
        setError(data.error || 'No providers found')
        setProviders([])
      }
    } catch (err) {
      setError('Failed to search. Please try again.')
      setProviders([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    searchProviders(specialty, location)
  }

  const handleQuickSearch = (spec: string, loc: string) => {
    setSpecialty(spec)
    setLocation(loc)
    searchProviders(spec, loc)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <main className="py-8">
        <div className="max-w-5xl mx-auto px-6">
          <CareHandoffBanner surface="providers" className="mb-6" />
          {/* Header */}
          <div className={`max-w-3xl mb-10 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
              Find care
            </p>
            <h1 className="text-4xl md:text-5xl font-normal tracking-tight mb-4 mt-2" style={{ lineHeight: '1.1' }}>
              Search providers,
              <br />
              <span style={{ color: 'var(--text-secondary)' }}>not directories.</span>
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Find clinicians by specialty and location. If someone is not on BaseHealth yet, you can still call the
              clinic directly from here.
            </p>

            {/* Mode toggle */}
            <div className="flex gap-3 mt-6">
              <Link
                href="/providers/search"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ 
                  backgroundColor: 'var(--text-primary)', 
                  color: 'var(--bg-primary)' 
                }}
              >
                Doctors & Specialists
              </Link>
              <Link
                href="/caregivers/search"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)'
                }}
              >
                Find Caregivers
              </Link>
            </div>
          </div>

          <div className={`grid gap-3 md:grid-cols-3 mb-8 ${mounted ? 'animate-fade-in-up delay-150' : 'opacity-0'}`}>
            {[
              { title: 'Search by specialty', body: 'Primary care, cardiology, dermatology, pediatrics, and more.' },
              { title: 'Use city or ZIP', body: 'Search by city, state, or ZIP code and use device location when needed.' },
              { title: 'Direct fallback', body: 'Not listed on BaseHealth yet? Call the clinic or open the NPI record.' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </div>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className={`mb-8 ${mounted ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Specialty Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Specialty (e.g., cardiologist, family doctor)"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg text-base focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Location Input */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="City, State or ZIP code (e.g., Portland, OR or 97201)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-24 py-3.5 rounded-lg text-base focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                />
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation('')}
                    className="absolute right-16 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isLocating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Use my location"
                >
                  {isLocating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Navigation className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Location Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm py-1" style={{ color: 'var(--text-muted)' }}>Quick:</span>
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => setLocation(loc.value)}
                  className="px-3 py-1 text-sm rounded-lg transition-colors"
                  style={location === loc.value ? { 
                    backgroundColor: 'var(--text-primary)', 
                    color: 'var(--bg-primary)' 
                  } : { 
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {loc.label}
                </button>
              ))}
            </div>

            {/* Detected Location Indicator */}
            {detectedLocation && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-700 text-sm">
                <Navigation className="h-4 w-4" />
                Location detected: {detectedLocation}
              </div>
            )}

            {/* Search Button */}
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isLoading}
                aria-label={isLoading ? "Searching" : "Search"}
                className="px-6 py-3 font-medium rounded-lg transition-colors flex items-center gap-2"
                style={{ 
                  backgroundColor: 'var(--text-primary)', 
                  color: 'var(--bg-primary)' 
                }}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Search Providers
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Specialty + Location Searches */}
          <div className={`mb-10 ${mounted ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Popular searches:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { spec: 'Primary Care', loc: 'Portland, Oregon' },
                { spec: 'Cardiologist', loc: 'Seattle, Washington' },
                { spec: 'Dermatologist', loc: 'San Francisco, California' },
                { spec: 'Family Doctor', loc: '97201' },
              ].map((search, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickSearch(search.spec, search.loc)}
                  className="px-3 py-2 rounded-lg transition-colors text-sm"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {search.spec} in {search.loc}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-700 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-6 bg-muted/20 border border-border rounded-2xl animate-pulse">
                  <div className="h-6 w-3/4 bg-muted/70 rounded mb-3" />
                  <div className="h-4 w-1/2 bg-muted/60 rounded mb-4" />
                  <div className="h-4 w-full bg-muted/60 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-muted/60 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && providers.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{providers.length} provider matches</p>
                {location && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Searching in: {location}
                  </p>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {providers.map((provider, index) => {
                  const isBaseHealth = provider.source === 'basehealth'
                  const isNpiRegistry = provider.source === 'npi_registry' || !provider.source
                  const isRealNpi = /^\d{10}$/.test(provider.npi)
                  const hasRating =
                    typeof provider.rating === "number" &&
                    Number.isFinite(provider.rating) &&
                    provider.rating > 0 &&
                    (typeof provider.reviewCount !== "number" || provider.reviewCount > 0)
                  
                  return (
                  <div 
                    key={provider.npi} 
                    className={`p-5 rounded-xl border transition-all group ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: isBaseHealth ? 'rgba(107, 155, 107, 0.3)' : 'var(--border-subtle)'
                    }}
                  >
                    {/* Source Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                          {provider.name}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{provider.credentials}</p>
                      </div>
                      {isBaseHealth ? (
                        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(107, 155, 107, 0.15)', color: '#6b9b6b' }}>
                          <BadgeCheck className="h-3 w-3" />
                          BaseHealth
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          NPI Registry
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-5">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{provider.specialty}</p>
                      <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span>
                          {provider.city}, {provider.state} {provider.zip}
                          {provider.distance && ` • ${provider.distance.toFixed(1)} mi`}
                        </span>
                      </div>
                      {provider.phone && provider.phone !== 'Contact for availability' && (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{provider.phone}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      {hasRating ? (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" style={{ color: 'hsl(var(--accent))', fill: 'hsl(var(--accent))' }} />
                          <span className="text-sm font-medium">{provider.rating!.toFixed(1)}</span>
                          {typeof provider.reviewCount === "number" && provider.reviewCount > 0 ? (
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({provider.reviewCount})</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Rating not available
                        </span>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {isRealNpi ? "NPI" : "ID"}: {provider.npi}
                      </span>
                    </div>

                    {/* Different actions based on provider source */}
                    {isBaseHealth ? (
                      // BaseHealth provider - profile + assistant for coordination
                      <Link 
                        href={`/providers/${provider.npi}`}
                        className="mt-4 w-full py-2.5 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2"
                        style={{ 
                          backgroundColor: 'var(--text-primary)',
                          color: 'var(--bg-primary)'
                        }}
                      >
                        View Profile
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      // NPI Registry provider - show contact options
                      <div className="mt-4 space-y-2">
                        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                          Not yet on BaseHealth. You can still contact them directly.
                        </p>
                        <div className="flex gap-2">
                          {provider.phone && provider.phone !== 'Contact for availability' ? (
                            <a 
                              href={`tel:${provider.phone.replace(/\D/g, '')}`}
                              className="flex-1 py-2.5 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2 border"
                              style={{ 
                                borderColor: 'var(--border-medium)',
                                color: 'var(--text-primary)'
                              }}
                            >
                              <Phone className="h-4 w-4" />
                              Call
                            </a>
                          ) : null}
                          <a
                            href={`https://npiregistry.cms.hhs.gov/provider-view/${provider.npi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 rounded-lg text-sm text-center transition-colors flex items-center justify-center gap-2 border"
                            style={{ 
                              borderColor: 'var(--border-medium)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            View Details
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </>
          )}

          {/* Empty State */}
          {!isLoading && providers.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <Search className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-xl font-medium mb-2">Search for Providers</h3>
              <p className="max-w-md mx-auto mb-3" style={{ color: 'var(--text-secondary)' }}>
                Enter a specialty and location above to find healthcare providers.
              </p>
              <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
                You can search by city name (Portland, Oregon), state (OR), or ZIP code (97201)
              </p>
              <div className="mb-8 rounded-xl border p-4 text-left max-w-xl mx-auto" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Need help deciding what kind of clinician to search for?
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Start with the assistant and describe the issue in plain language. It can point you to primary care,
                  specialist care, telehealth, or the next best step.
                </p>
                <Link
                  href="/chat?q=Help%20me%20figure%20out%20what%20provider%20I%20need"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Ask the assistant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => handleQuickSearch('Primary Care', 'Portland, Oregon')}
                  className="px-5 py-2.5 font-medium rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: 'var(--text-primary)', 
                    color: 'var(--bg-primary)' 
                  }}
                >
                  Primary Care in Portland, OR
                </button>
                <button
                  onClick={() => handleQuickSearch('Family Doctor', '97201')}
                  className="px-5 py-2.5 font-medium rounded-lg transition-colors border"
                  style={{ 
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Search by ZIP: 97201
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ProvidersSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
