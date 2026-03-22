"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const CATEGORIES = [
  { value: "ux", label: "UX / Design" },
  { value: "agents", label: "Agents" },
  { value: "billing", label: "Billing / Receipts / Refunds" },
  { value: "payments", label: "Payments (Base)" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "compliance", label: "Compliance / Safety" },
  { value: "other", label: "Other" },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState<string>("ux")
  const [rating, setRating] = useState<string>("5")
  const [message, setMessage] = useState<string>("")
  const [page, setPage] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  const resolvedRating = useMemo(() => {
    const parsed = Number.parseInt(rating, 10)
    if (!Number.isFinite(parsed)) return undefined
    return Math.max(1, Math.min(5, parsed))
  }, [rating])

  const submit = async () => {
    const trimmed = message.trim()
    if (trimmed.length < 5) {
      toast.error("Please add a bit more detail.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating: resolvedRating,
          page: page.trim() || (typeof window !== "undefined" ? window.location.pathname : undefined),
          message: trimmed,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to submit feedback.")
      }

      toast.success("Feedback submitted. Thank you.")
      setMessage("")
      setPage("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit feedback.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Feedback</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              Help improve BaseHealth,
              <br />
              <span className="text-muted-foreground">with specifics.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              Tell us what is confusing, broken, or missing. We review feedback and prioritize patterns that show clear
              consensus across users.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Do not include PHI
            </Badge>
            <Badge variant="outline">Short, concrete notes are easiest to act on</Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="bg-card/25">
            <CardHeader>
              <CardTitle className="text-xl">Submit feedback</CardTitle>
              <CardDescription>Say what happened, what you expected, and where it happened.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 w-full rounded-full border border-border/60 bg-background/70 px-4 text-sm text-foreground"
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-foreground">Rating (1-5)</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="h-11 w-full rounded-full border border-border/60 bg-background/70 px-4 text-sm text-foreground"
                  >
                    {["5", "4", "3", "2", "1"].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground">Page (optional)</label>
                <Input value={page} onChange={(e) => setPage(e.target.value)} placeholder="e.g. /screening" />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What should change? What did you expect to happen?"
                  className="min-h-[160px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit feedback"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setMessage("")} disabled={submitting}>
                  Clear message
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-card/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What gets prioritized</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Broken flows</p>
                  <p className="mt-1">Anything that blocks chat, search, signup, billing, or payment completion.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Repeated UX pain</p>
                  <p className="mt-1">Confusion, contrast issues, or pages that feel heavier than they need to be.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Clear consensus</p>
                  <p className="mt-1">Changes multiple users ask for are easier to justify and ship quickly.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Want to fund improvements too?</CardTitle>
                <CardDescription>Feedback shapes the roadmap. Support helps move it faster.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild variant="outline">
                  <Link href="/support">
                    Tip or support growth
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/chat?q=How%20should%20I%20use%20BaseHealth%20most%20effectively%3F">
                    Ask assistant
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
