"use client"

/**
 * Clinical Trials (minimal)
 * Source: ClinicalTrials.gov (via /api/clinical-trials)
 */

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Building2,
  ExternalLink,
  FlaskConical,
  Loader2,
  MapPin,
  Search,
  Users,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ClinicalTrial {
  nctId: string
  briefTitle: string
  briefSummary: string
  condition: string
  phase: string
  enrollment: number
  locationString: string
  studyType: string
  eligibilityScore?: number
  recommendationLevel?: string
}

const CANCER_CENTERS = [
  { name: "MD Anderson", city: "Houston, TX" },
  { name: "Memorial Sloan Kettering", city: "New York, NY" },
  { name: "Mayo Clinic", city: "Rochester, MN" },
  { name: "Dana-Farber", city: "Boston, MA" },
  { name: "Fred Hutch", city: "Seattle, WA" },
  { name: "UCSF", city: "San Francisco, CA" },
  { name: "UCLA", city: "Los Angeles, CA" },
  { name: "Stanford", city: "Palo Alto, CA" },
  { name: "OHSU", city: "Portland, OR" },
  { name: "Johns Hopkins", city: "Baltimore, MD" },
  { name: "Cleveland Clinic", city: "Cleveland, OH" },
  { name: "Duke", city: "Durham, NC" },
]

const QUICK_SEARCHES = [
  { label: "Lung cancer (CA)", condition: "lung cancer", location: "California" },
  { label: "Breast cancer (NY)", condition: "breast cancer", location: "New York" },
  { label: "Type 2 diabetes (TX)", condition: "type 2 diabetes", location: "Texas" },
  { label: "Hypertension (FL)", condition: "hypertension", location: "Florida" },
]

const CATEGORY_GROUPS = [
  {
    name: "Oncology",
    conditions: ["Lung Cancer", "Breast Cancer", "Prostate Cancer", "Leukemia", "Lymphoma", "Colon Cancer", "Melanoma"],
  },
  {
    name: "Cardiovascular",
    conditions: ["Hypertension", "Heart Failure", "Coronary Artery Disease", "Atrial Fibrillation"],
  },
  {
    name: "Metabolic",
    conditions: ["Type 2 Diabetes", "Type 1 Diabetes", "Obesity", "Metabolic Syndrome"],
  },
]

export default function ClinicalTrialsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [institution, setInstitution] = useState("")
  const [trials, setTrials] = useState<ClinicalTrial[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const searchTrials = async (conditionOverride?: string, locationOverride?: string, institutionOverride?: string) => {
    const searchCondition = conditionOverride ?? searchQuery
    const searchLocation = locationOverride ?? location
    const searchInstitution = institutionOverride ?? institution

    if (!searchCondition.trim() && !searchLocation.trim() && !searchInstitution.trim()) {
      setError("Enter a condition, location, or institution to search.")
      return
    }

    setIsLoading(true)
    setError(null)
    setTrials([])

    try {
      const params = new URLSearchParams()

      if (searchCondition.trim()) params.append("query", searchCondition.trim())
      if (searchLocation.trim()) params.append("location", searchLocation.trim())
      if (searchInstitution.trim()) params.append("institution", searchInstitution.trim())
      params.append("pageSize", "25")

      const response = await fetch(`/api/clinical-trials?${params.toString()}`)
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || `Search failed: ${response.status}`)
      }

      if (data?.error) {
        setError(data.error)
        setTrials([])
      } else if (data?.studies && data.studies.length > 0) {
        setTrials(data.studies)
        setTotalCount(data.totalCount || data.studies.length)
      } else {
        setError("No actively recruiting trials found. Try different search terms or check back later.")
        setTrials([])
      }
    } catch (err) {
      console.error("Clinical trials search error:", err)
      setError("Failed to search clinical trials. Please try again.")
      setTrials([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchTrials()
  }

  const runQuickSearch = (condition: string, loc: string) => {
    setSearchQuery(condition)
    setLocation(loc)
    setInstitution("")
    searchTrials(condition, loc, "")
  }

  const searchByCenter = (centerName: string, centerCity: string) => {
    setSearchQuery("")
    setLocation(centerCity)
    setInstitution(centerName)
    searchTrials("", centerCity, centerName)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Clinical Trials Research Network</p>
              <h1 className="mt-2 text-2xl sm:text-4xl font-semibold tracking-tight">Search trials without the clutter.</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Search ClinicalTrials.gov by condition, location, or institution. Use this page to narrow the field,
                then confirm details directly with the trial team.
              </p>
            </div>
            <Link
              href="/chat?q=Help%20me%20search%20for%20clinical%20trials"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Ask assistant
            </Link>
          </div>
        </header>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {[
            { label: "Coverage", value: "400,000+", detail: "ClinicalTrials.gov records" },
            { label: "Decision rule", value: "Call first", detail: "Enrollment can change quickly" },
            { label: "Shortcuts", value: "Centers + categories", detail: "Search by condition or institution" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-card/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>

        <Alert className="mb-6 border-border bg-muted/20">
          <AlertCircle className="h-4 w-4" />
          <div>
            <AlertTitle>Important notice</AlertTitle>
            <AlertDescription>
              Trial availability shown here may not reflect real-time status. Some institutions may not have updated
              whether a trial is still enrolling. Always contact the clinical trial team directly to confirm current
              enrollment status and eligibility before making any decisions.
            </AlertDescription>
          </div>
        </Alert>

        <Card className="mb-6 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Start with the condition, not the form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <div className="relative">
                    <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Condition, disease, or keyword (e.g., lung cancer)"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="h-11">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              <details className="rounded-lg border border-border bg-muted/20 p-4">
                <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
                  Filters (optional)
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Location (city, state)"
                      className="h-11 pl-9"
                    />
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Institution (optional)"
                      className="h-11 pl-9"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground hover:underline underline-offset-4"
                    onClick={() => {
                      setLocation("")
                      setInstitution("")
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </details>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick searches</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SEARCHES.map((q) => (
                  <Button key={q.label} type="button" variant="outline" size="sm" onClick={() => runQuickSearch(q.condition, q.location)}>
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>

            <details className="rounded-lg border border-border bg-muted/20 p-4">
              <summary className="cursor-pointer select-none text-sm font-medium text-foreground">Popular categories</summary>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {CATEGORY_GROUPS.map((group) => (
                  <div key={group.name} className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-semibold text-foreground">{group.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.conditions.map((condition) => (
                        <Button
                          key={condition}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => runQuickSearch(condition, "")}
                        >
                          {condition}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <details className="rounded-lg border border-border bg-muted/20 p-4">
              <summary className="cursor-pointer select-none text-sm font-medium text-foreground">
                Major cancer & research centers
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {CANCER_CENTERS.map((center) => (
                  <Button
                    key={center.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => searchByCenter(center.name, center.city)}
                  >
                    {center.name}
                    <span className="ml-1 text-muted-foreground">({center.city.split(",")[0]})</span>
                  </Button>
                ))}
              </div>
            </details>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <div>
              <AlertTitle>Search error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-5">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-muted" />
                  <div className="mt-4 h-3 w-full rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && trials.length > 0 && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Showing {trials.length} of {totalCount.toLocaleString()} trials
              </p>
              <Badge variant="outline">ClinicalTrials.gov source</Badge>
            </div>

            <div className="space-y-3">
              {trials.map((trial) => {
                const phase = (trial.phase || "").replace("PHASE", "").trim()
                const summary = (trial.briefSummary || "").trim()
                return (
                  <Card key={trial.nctId} className="border-border">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {phase && <Badge variant="secondary">Phase {phase}</Badge>}
                            <span className="text-xs font-mono text-muted-foreground">{trial.nctId}</span>
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold leading-snug">{trial.briefTitle}</h3>

                          {summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {summary.length > 320 ? `${summary.slice(0, 320)}…` : summary}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                            {trial.condition && (
                              <span className="inline-flex items-center gap-2">
                                <FlaskConical className="h-3.5 w-3.5" />
                                {trial.condition.split(",").slice(0, 2).join(", ")}
                              </span>
                            )}
                            {trial.enrollment > 0 && (
                              <span className="inline-flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                {trial.enrollment.toLocaleString()} participants
                              </span>
                            )}
                            {trial.locationString && (
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                {trial.locationString}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button asChild variant="outline" className="sm:mt-1">
                          <a
                            href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View details
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        {!isLoading && trials.length === 0 && !error && (
          <Card className="border-border">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Search clinical trials</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter a condition and (optionally) a location or institution. You can also ask the assistant for help
                refining your query.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {QUICK_SEARCHES.map((q) => (
                  <Button key={q.label} type="button" variant="outline" size="sm" onClick={() => runQuickSearch(q.condition, q.location)}>
                    {q.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
