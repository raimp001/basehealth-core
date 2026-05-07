"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react"

import { BasePayCheckout } from "@/components/checkout/base-pay-checkout"
import {
  PAYMENT_HANDOFF_STORAGE_KEY,
  isFreshCareHandoff,
  safeSessionGetItem,
  safeSessionRemoveItem,
  type PaymentHandoffPayload,
} from "@/lib/care-handoff"

type Preset = {
  id: string
  name: string
  description: string
  amountUsd: number
  serviceType: string
}

const PRESETS: Preset[] = [
  {
    id: "screening",
    name: "Screening assessment",
    description:
      "Run the USPSTF-aligned screening assessment and unlock personalized recommendations.",
    amountUsd: 0.25,
    serviceType: "screening_assessment",
  },
  {
    id: "second-opinion",
    name: "Second opinion request",
    description:
      "Submit a clinical second-opinion request to the BaseHealth specialist network.",
    amountUsd: 25,
    serviceType: "second_opinion",
  },
  {
    id: "telemedicine",
    name: "Telemedicine consult",
    description:
      "Pay the consult fee in USDC. Connects to the matched provider after confirmation.",
    amountUsd: 75,
    serviceType: "telemedicine_consult",
  },
]

function newOrderId(prefix = "bh") {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().split("-")[0] : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}_${rand}`
}

export function BasePayLanding() {
  const router = useRouter()
  const params = useSearchParams()
  const [handoff, setHandoff] = useState<PaymentHandoffPayload | null>(null)
  const [selectedId, setSelectedId] = useState<string>("screening")

  // Pull handoff from sessionStorage (chat → payment) or URL fallback.
  useEffect(() => {
    const stored = safeSessionGetItem(PAYMENT_HANDOFF_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PaymentHandoffPayload
        if (isFreshCareHandoff(parsed.createdAt)) {
          setHandoff(parsed)
        }
      } catch {
        // ignore — fall back to URL params
      }
      safeSessionRemoveItem(PAYMENT_HANDOFF_STORAGE_KEY)
      return
    }

    const amount = params.get("amount")
    const reason = params.get("reason")
    const source = params.get("handoff") as PaymentHandoffPayload["source"] | null
    if (amount) {
      const amountUsd = Math.max(0.01, parseFloat(amount))
      if (Number.isFinite(amountUsd)) {
        setHandoff({
          source: source || "chat",
          amountUsd,
          reason: reason || "BaseHealth payment",
          createdAt: Date.now(),
        })
      }
    }
  }, [params])

  const selected = useMemo(() => {
    if (handoff) {
      return {
        id: "handoff",
        name: "Pay from chat",
        description: handoff.reason,
        amountUsd: handoff.amountUsd,
        serviceType: "chat_handoff",
      } satisfies Preset
    }
    return PRESETS.find((p) => p.id === selectedId) || PRESETS[0]
  }, [handoff, selectedId])

  const orderId = useMemo(() => newOrderId(), [selected.id, selected.amountUsd])

  return (
    <div className="space-y-8">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          One-tap USDC checkout
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-semibold tracking-tight">
          Pay for care on Base.
        </h1>
        <p className="mt-3 max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
          Screening fees, second opinions, and consults settle in seconds — no card details, no
          chain switching, no gas fees shown. Confirm with FaceID or a passkey.
        </p>
      </div>

      {handoff ? (
        <div className="rounded-2xl border border-primary/40 bg-card/40 p-4 text-sm">
          <p className="font-semibold text-foreground">From your chat session</p>
          <p className="mt-1 text-muted-foreground">{handoff.reason}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {PRESETS.map((preset) => {
            const active = preset.id === selectedId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedId(preset.id)}
                className={`text-left rounded-2xl border p-4 transition ${
                  active
                    ? "border-primary/60 bg-card/60 shadow-glow-cyan"
                    : "border-border/60 bg-card/30 hover:border-primary/40 hover:bg-card/45"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                  <span className="text-xs font-mono text-muted-foreground">
                    ${preset.amountUsd.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {preset.description}
                </p>
              </button>
            )
          })}
        </div>
      )}

      <div className="rounded-3xl border border-border/60 bg-card/30 p-4 sm:p-6 backdrop-blur-md shadow-enterprise">
        <BasePayCheckout
          amount={selected.amountUsd}
          serviceName={selected.name}
          serviceType={selected.serviceType}
          serviceDescription={selected.description}
          orderId={orderId}
          providerId="basehealth-platform"
          onSuccess={(result) => {
            const params = new URLSearchParams({
              paymentId: result.paymentId,
              service: selected.serviceType,
            })
            if (result.txHash) params.set("tx", result.txHash)
            router.push(`/payment/success?${params.toString()}`)
          }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Zap,
            title: "~2 second settlement",
            description: "USDC on Base finalizes in roughly two seconds.",
          },
          {
            icon: ShieldCheck,
            title: "No card on file",
            description: "Smart-wallet auth via FaceID or passkey.",
          },
          {
            icon: CheckCircle2,
            title: "Audit-ready receipts",
            description: "Every payment links to an on-chain receipt.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border/60 bg-background/45 p-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-primary">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => router.push("/chat")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Ask BaseHealth instead <ArrowRight className="h-4 w-4 text-primary" />
        </button>
      </div>
    </div>
  )
}
