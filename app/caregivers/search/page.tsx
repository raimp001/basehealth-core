"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  HeartHandshake,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
  Shield,
  Star,
  User,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Caregiver {
  id: string
  name: string
  specialty: string
  specialties: string[]
  yearsExperience: string
  location: string
  serviceAreas: string[]
  languages: string[]
  hourlyRate: number | null
  rating: number
  reviewCount: number
  bio: string
  verified: boolean
  badges: string[]
  acceptsInsurance: boolean
  willingToTravel: boolean
  availableForUrgent: boolean
  phone?: string
}

const CAREGIVER_SPECIALTIES = [
  { label: "All care types", value: "" },
  { label: "Elder care", value: "Elder Care" },
  { label: "Post-surgery", value: "Post-Surgery Care" },
  { label: "Dementia care", value: "Dementia Care" },
  { label: "Pediatric care", value: "Pediatric Care" },
  { label: "Disability support", value: "Disability Support" },
  { label: "Chronic illness", value: "Chronic Illness Care" },
  { label: "Hospice care", value: "Hospice Care" },
  { label: "Companionship", value: "Companionship" },
]

const QUICK_SEARCHES = [
  { label: "Post-surgery in San Francisco", location: "San Francisco, CA", specialty: "Post-Surgery Care" },
  { label: "Elder care in Portland", location: "Portland, OR", specialty: "Elder Care" },
  { label: "Urgent caregiver in Seattle", location: "Seattle, WA", specialty: "" },
]

function isZipCode(input: string) {
  return /^\d{5}(-\d{4})?$/.test(input.trim())
}

export default function CaregiverSearchPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [locationInput, setLocationInput] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser")
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/geocode/reverse?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
          )
          if (response.ok) {
            const data = await response.json()
            if (data.city && data.state) {
              setLocationInput(`${data.city}, ${data.state}`)
            } else if (data.zip) {
              setLocationInput(data.zip)
            }
          }
        } catch {
          setError("Could not detect location. Enter city or ZIP manually.")
        } finally {
          setIsLocating(false)
        }
      },
      () => {
        setError("Could not detect location. Enter city or ZIP manually.")
        setIsLocating(false)
      },
      { timeout: 10000 },
    )
  }

  const searchCaregivers = async (nextLocation = locationInput, nextSpecialty = specialty, nextUrgent = urgentOnly) => {
    if (!nextLocation.trim()) {
      setError("Enter a ZIP code or city to search")
      return
    }

    setLoading(true)
    setHasSearched(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (isZipCode(nextLocation)) {
        params.append("zipCode", nextLocation.trim())
      } else {
        params.append("location", nextLocation.trim())
      }
      if (nextSpecialty) params.append("specialty", nextSpecialty)
      if (nextUrgent) params.append("urgent", "true")

      const response = await fetch(`/api/caregivers/search?${params.toString()}`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Search failed")
      }

      const results = Array.isArray(data.caregivers) ? data.caregivers : []
      setCaregivers(results)
      if (results.length === 0) {
        setError("No caregivers found yet in this area. Try a nearby city or broader care type.")
      }
    } catch (err) {
      setCaregivers([])
      setError(err instanceof Error ? err.message : "Search failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    await searchCaregivers()
  }

  const runQuickSearch = async (nextLocation: string, nextSpecialty: string) => {
    setLocationInput(nextLocation)
    setSpecialty(nextSpecialty)
    setUrgentOnly(false)
    await searchCaregivers(nextLocation, nextSpecialty, false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className={`max-w-3xl mb-10 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Find support</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
            Search caregivers,
            <br />
            <span className="text-muted-foreground">not classifieds.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Find verified local support for elder care, recovery, companionship, and urgent home help without exposing a
            cluttered workflow to families.
          </p>

          <div className="mt-6 flex gap-3 flex-wrap">
            <Link
              href="/providers/search"
              className="px-4 py-2 rounded-full text-sm font-medium border border-border/60 bg-card/15 text-muted-foreground hover:text-foreground hover:bg-card/30 transition-colors"
            >
              Doctors & specialists
            </Link>
            <Link
              href="/caregivers/search"
              className="px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-glow-cyan"
            >
              Caregivers
            </Link>
          </div>
        </header>

        <div className={`grid gap-3 md:grid-cols-3 mb-8 ${mounted ? "animate-fade-in-up delay-150" : "opacity-0"}`}>
          {[
            {
              title: "Home + recovery support",
              body: "Search elder care, post-surgery help, disability support, companionship, and more.",
            },
            {
              title: "Use ZIP or city",
              body: "Search by city, state, or ZIP and use device location when needed.",
            },
            {
              title: "Urgent fallback",
              body: "Need fast help? Filter for urgent availability and let the assistant help coordinate next steps.",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-card/25">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <form onSubmit={handleSearch} className={`mb-8 ${mounted ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
          <Card className="bg-card/20">
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto_auto] lg:items-end">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="ZIP code or city"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full rounded-full border border-border/60 bg-background/70 py-3 pl-10 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
                    />
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={isLocating}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      title="Use my location"
                    >
                      {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Care type</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="h-12 w-full rounded-full border border-border/60 bg-background/70 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/50"
                  >
                    {CAREGIVER_SPECIALTIES.map((item) => (
                      <option key={item.value || "all"} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex h-12 items-center gap-2 rounded-full border border-border/60 bg-background/50 px-4 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={urgentOnly}
                    onChange={(e) => setUrgentOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Urgent only
                </label>

                <Button type="submit" size="lg" disabled={loading || !locationInput.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Search</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => runQuickSearch(item.location, item.specialty)}
                    className="rounded-full border border-border/60 bg-card/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card/30 hover:text-foreground"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </form>

        {error ? (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!hasSearched ? (
          <Card className="bg-card/20">
            <CardContent className="px-6 py-14 text-center">
              <HeartHandshake className="mx-auto h-12 w-12 text-primary/70" />
              <h2 className="mt-5 text-xl font-semibold text-foreground">Search for caregivers</h2>
              <p className="mt-2 mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                Enter a city or ZIP to find verified caregivers. If you are not sure what kind of support is needed,
                start with the assistant and we will route the request.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Badge variant="outline">Background checks when available</Badge>
                <Badge variant="outline">Urgent support filters</Badge>
                <Badge variant="outline">Local search with fallback routing</Badge>
              </div>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Searching for caregivers...</p>
          </div>
        ) : caregivers.length === 0 ? (
          <Card className="bg-card/20">
            <CardContent className="px-6 py-14 text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-5 text-xl font-semibold text-foreground">No caregivers found yet</h2>
              <p className="mt-2 mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                Try a nearby city or broader care type. You can also use the assistant to figure out whether you need a
                caregiver, a provider, or both.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Button asChild>
                  <Link href="/chat?q=Help%20me%20figure%20out%20what%20kind%20of%20care%20support%20I%20need">
                    Ask assistant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/join?role=caregiver">Apply as caregiver</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {caregivers.length} caregiver match{caregivers.length !== 1 ? "es" : ""}
            </p>

            {caregivers.map((caregiver) => (
              <Card key={caregiver.id} className="bg-card/20">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background/60">
                      <HeartHandshake className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">{caregiver.name}</h3>
                            {caregiver.verified ? (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle className="h-3 w-3 text-primary" />
                                Verified
                              </Badge>
                            ) : null}
                            {caregiver.availableForUrgent ? <Badge>Urgent available</Badge> : null}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{caregiver.specialty}</p>
                        </div>

                        {caregiver.hourlyRate ? (
                          <div className="text-left md:text-right">
                            <p className="text-lg font-semibold text-foreground">${caregiver.hourlyRate}/hr</p>
                            <p className="text-xs text-muted-foreground">Typical hourly rate</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {caregiver.rating > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400" />
                            {caregiver.rating.toFixed(1)}
                            <span className="text-muted-foreground/70">({caregiver.reviewCount})</span>
                          </span>
                        ) : null}
                        {caregiver.yearsExperience && caregiver.yearsExperience !== "N/A" ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {caregiver.yearsExperience} experience
                          </span>
                        ) : null}
                        {caregiver.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {caregiver.location}
                          </span>
                        ) : null}
                      </div>

                      {caregiver.bio ? (
                        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{caregiver.bio}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {caregiver.badges.map((badge) => (
                          <Badge key={badge} variant="outline" className="gap-1">
                            <Shield className="h-3 w-3 text-primary" />
                            {badge}
                          </Badge>
                        ))}
                        {caregiver.willingToTravel ? <Badge variant="outline">Willing to travel</Badge> : null}
                        {caregiver.acceptsInsurance ? <Badge variant="outline">Insurance friendly</Badge> : null}
                        {caregiver.languages.slice(0, 2).map((language) => (
                          <Badge key={language} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-5 flex flex-col sm:flex-row gap-3">
                        {caregiver.phone ? (
                          <Button asChild>
                            <Link href={`tel:${caregiver.phone}`}>
                              <Phone className="mr-2 h-4 w-4" />
                              Call caregiver
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild>
                            <Link
                              href={`/chat?q=${encodeURIComponent(`Help me contact caregiver ${caregiver.name} for ${caregiver.specialty}.`)}`}
                            >
                              Request intro
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="outline">
                          <Link
                            href={`/chat?q=${encodeURIComponent(`Help me compare caregiver options near ${locationInput || caregiver.location}.`)}`}
                          >
                            Compare with assistant
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-10 bg-card/20">
          <CardContent className="p-8 text-center">
            <HeartHandshake className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">Are you a caregiver?</h2>
            <p className="mt-2 mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Apply once to join the network. We review experience, help with discoverability, and keep scheduling and
              payments in one flow.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild>
                <Link href="/join?role=caregiver">
                  Apply as caregiver
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/join">Compare provider vs caregiver signup</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
