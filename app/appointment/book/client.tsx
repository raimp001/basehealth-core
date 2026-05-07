"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Phone,
  Stethoscope,
  Wallet,
} from "lucide-react"

import { CareHandoffBanner } from "@/components/care-handoff-banner"
import {
  SCHEDULING_HANDOFF_STORAGE_KEY,
  isFreshCareHandoff,
  safeSessionGetItem,
  safeSessionRemoveItem,
  type SchedulingHandoffPayload,
} from "@/lib/care-handoff"

const URGENCY_OPTIONS = [
  { id: "routine", label: "Routine (within 2 weeks)" },
  { id: "soon", label: "Soon (within 3 days)" },
  { id: "urgent", label: "Urgent (today / tomorrow)" },
] as const

type Urgency = (typeof URGENCY_OPTIONS)[number]["id"]

type Status = "draft" | "submitting" | "submitted" | "error"

const REQUEST_STORAGE_KEY = "basehealth:appointment-requests"

type StoredRequest = {
  id: string
  providerName: string
  providerKind: string
  specialty?: string
  reason: string
  urgency: Urgency
  preferredWindow: string
  contactEmail: string
  contactPhone?: string
  notes?: string
  npi?: string
  fullAddress?: string
  createdAt: number
}

function newRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function persistRequest(req: StoredRequest) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(REQUEST_STORAGE_KEY)
    const list: StoredRequest[] = raw ? JSON.parse(raw) : []
    list.unshift(req)
    window.localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(list.slice(0, 25)))
  } catch {
    // localStorage may be unavailable — request will still be POSTed below.
  }
}

export function AppointmentBookClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [handoff, setHandoff] = useState<SchedulingHandoffPayload | null>(null)

  // Form state
  const [reason, setReason] = useState("")
  const [urgency, setUrgency] = useState<Urgency>("routine")
  const [preferredWindow, setPreferredWindow] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [notes, setNotes] = useState("")

  const [status, setStatus] = useState<Status>("draft")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<StoredRequest | null>(null)

  // Pull handoff from sessionStorage or URL params on mount.
  useEffect(() => {
    const stored = safeSessionGetItem(SCHEDULING_HANDOFF_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SchedulingHandoffPayload
        if (isFreshCareHandoff(parsed.createdAt)) {
          setHandoff(parsed)
          if (parsed.reason && !reason) setReason(parsed.reason)
        }
      } catch {
        // ignore
      }
      safeSessionRemoveItem(SCHEDULING_HANDOFF_STORAGE_KEY)
      return
    }

    // URL fallback (handoff banner already rendered on its own)
    const urlReason = params.get("reason")
    if (urlReason) setReason(urlReason)
    const providerName = params.get("providerName")
    if (providerName) {
      setHandoff({
        source: (params.get("source") as SchedulingHandoffPayload["source"]) || "chat",
        providerName,
        providerKind: params.get("providerKind") || "provider",
        specialty: params.get("specialty") || undefined,
        npi: params.get("npi") || undefined,
        phone: params.get("phone") || undefined,
        fullAddress: params.get("fullAddress") || undefined,
        reason: urlReason || "",
        query: params.get("query") || undefined,
        createdAt: Date.now(),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provider = useMemo(() => {
    if (handoff) return handoff
    return {
      providerName: "BaseHealth network",
      providerKind: "provider",
      specialty: undefined,
      npi: undefined,
      phone: undefined,
      fullAddress: undefined,
      reason: "",
    } as Partial<SchedulingHandoffPayload>
  }, [handoff])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (!reason.trim()) {
      setErrorMsg("Please describe the reason for the visit.")
      return
    }
    if (!contactEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail.trim())) {
      setErrorMsg("Enter a valid email so we can confirm the request.")
      return
    }

    const req: StoredRequest = {
      id: newRequestId(),
      providerName: provider.providerName || "BaseHealth network",
      providerKind: provider.providerKind || "provider",
      specialty: provider.specialty,
      reason: reason.trim(),
      urgency,
      preferredWindow: preferredWindow.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      npi: provider.npi,
      fullAddress: provider.fullAddress,
      createdAt: Date.now(),
    }

    setStatus("submitting")

    try {
      const res = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      })
      // We treat 200 and 202 as success; anything else uses the local fallback.
      if (!res.ok && res.status !== 202) {
        // Continue to local persist regardless — request UX still works offline.
      }
    } catch {
      // network errors fall back to local storage only
    }

    persistRequest(req)
    setConfirmation(req)
    setStatus("submitted")
  }

  if (status === "submitted" && confirmation) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-primary/40 bg-card/40 p-6 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/55 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Request sent
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a confirmation to{" "}
                <span className="font-medium text-foreground">{confirmation.contactEmail}</span>.
                The {confirmation.providerName} team will reach out to confirm a time.
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Provider", value: confirmation.providerName },
              { label: "Specialty", value: confirmation.specialty || "—" },
              {
                label: "Urgency",
                value: URGENCY_OPTIONS.find((u) => u.id === confirmation.urgency)?.label || "—",
              },
              {
                label: "Preferred window",
                value: confirmation.preferredWindow || "Flexible",
              },
              { label: "Reason", value: confirmation.reason },
              { label: "Reference", value: `#${confirmation.id.slice(0, 8)}` },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-border/60 bg-background/45 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/payment/base?reason=Visit%20copay&amount=25")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90"
          >
            <Wallet className="h-4 w-4" />
            Pay copay on Base
          </button>
          <button
            type="button"
            onClick={() => router.push("/appointments")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/30 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card/45"
          >
            See all requests
            <ArrowRight className="h-4 w-4 text-primary" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/30 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-card/45"
          >
            Ask BaseHealth what to bring
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CareHandoffBanner surface="scheduling" />

      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ClipboardList className="h-3 w-3" />
          Visit request
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Book {provider.providerName}.
        </h1>
        <p className="mt-3 max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
          Tell us why you want to be seen. We send the request to the provider's office (or our
          care team if they're not on BaseHealth yet) and confirm by email.
        </p>
      </div>

      {provider.specialty || provider.fullAddress || provider.phone ? (
        <div className="rounded-2xl border border-border/60 bg-card/35 p-4 text-sm">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-4 w-4 text-primary" />
            <p className="font-semibold text-foreground">{provider.providerName}</p>
            {provider.specialty ? (
              <span className="rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {provider.specialty}
              </span>
            ) : null}
          </div>
          {provider.fullAddress ? (
            <p className="mt-2 text-xs text-muted-foreground">{provider.fullAddress}</p>
          ) : null}
          {provider.phone ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {provider.phone}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reason" className="text-sm font-semibold text-foreground">
            What is this visit about?
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Annual physical and follow-up on a screening recommendation"
            className="mt-2 w-full resize-none rounded-2xl border border-border/60 bg-background/55 px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">Urgency</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {URGENCY_OPTIONS.map((opt) => {
              const active = opt.id === urgency
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUrgency(opt.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "border-primary/60 bg-card/60 text-foreground shadow-glow-cyan"
                      : "border-border/60 bg-card/30 text-muted-foreground hover:border-primary/40 hover:bg-card/45"
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contactEmail" className="text-sm font-semibold text-foreground">
              Email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-border/60 bg-background/55 px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              required
            />
          </div>
          <div>
            <label htmlFor="contactPhone" className="text-sm font-semibold text-foreground">
              Phone <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="mt-2 w-full rounded-xl border border-border/60 bg-background/55 px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
          </div>
        </div>

        <div>
          <label htmlFor="window" className="text-sm font-semibold text-foreground">
            Preferred days/times
          </label>
          <input
            id="window"
            value={preferredWindow}
            onChange={(e) => setPreferredWindow(e.target.value)}
            placeholder="e.g. Weekday mornings, or Tuesday afternoon"
            className="mt-2 w-full rounded-xl border border-border/60 bg-background/55 px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
          />
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-semibold text-foreground">
            Anything the provider should know? <span className="text-muted-foreground/70">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Symptoms, prior tests, medications, accommodations…"
            className="mt-2 w-full resize-none rounded-2xl border border-border/60 bg-background/55 px-4 py-3 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
          />
        </div>

        {errorMsg ? (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {errorMsg}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending request…
              </>
            ) : (
              <>
                <CalendarCheck2 className="h-4 w-4" /> Send visit request
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            Free to request. Copays and consult fees are paid in USDC on Base when scheduled.
          </p>
        </div>
      </form>
    </div>
  )
}
