"use client"

/**
 * CareAskPanel — chat-first hero for BaseHealth.
 *
 * Adapted from the OpenRx pattern: one input, four suggestion chips, and a
 * router that decides whether to answer in chat or hand off to a structured
 * action surface (screening, provider search, scheduling, Base Pay).
 *
 * Lives on the landing page, the dashboard, and anywhere else we want a
 * single conversational entry point.
 */

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react"

import {
  fallbackHrefForCareHandoff,
  resolveCareHandoff,
  safeSessionSetItem,
} from "@/lib/care-handoff"
import { cn } from "@/lib/utils"

type CareAskSuggestion = {
  label: string
  prompt: string
  topic?: string
}

type BackgroundLane = {
  label: string
  detail: string
  icon: typeof Bot
}

type CareAskPanelProps = {
  eyebrow?: string
  title?: string
  description?: string
  placeholder?: string
  defaultPrompt?: string
  suggestions?: CareAskSuggestion[]
  lanes?: BackgroundLane[]
  compact?: boolean
  minimal?: boolean
  showLanes?: boolean
  className?: string
}

const defaultSuggestions: CareAskSuggestion[] = [
  {
    label: "What screening is due?",
    prompt: "What cancer screening does a 50-year-old woman need?",
    topic: "screening",
  },
  {
    label: "Find primary care",
    prompt: "Find a primary care option near me and explain what to ask before booking.",
    topic: "scheduling",
  },
  {
    label: "Pay $0.25 on Base",
    prompt: "Run my screening assessment and pay the $0.25 fee in USDC on Base.",
    topic: "payment",
  },
  {
    label: "What should I do next?",
    prompt: "Tell me the highest-priority next step and route me to the right care service.",
    topic: "coordinator",
  },
]

const defaultLanes: BackgroundLane[] = [
  {
    label: "Understand the ask",
    detail:
      "You start with one sentence. BaseHealth looks for screening, provider, billing, medication, or follow-up intent.",
    icon: FileText,
  },
  {
    label: "Answer in chat",
    detail:
      "Screening and clinical questions answer directly in chat with guideline links. No extra forms unless they're essential.",
    icon: Sparkles,
  },
  {
    label: "Hand off only when needed",
    detail:
      "If you need to book, pay, or coordinate, BaseHealth prepares it from the same conversation — payments settle in USDC on Base.",
    icon: CheckCircle2,
  },
]

export function CareAskPanel({
  eyebrow = "Ask BaseHealth",
  title = "Start with one question.",
  description = "Plain English. Screening and clinical guidance answer directly in chat; provider search, scheduling, and on-chain payment stay one step away.",
  placeholder = "Ask what screening is due, find care near you, or start a Base Pay checkout…",
  defaultPrompt = "",
  suggestions = defaultSuggestions,
  lanes = defaultLanes,
  compact = false,
  minimal = false,
  showLanes = false,
  className,
}: CareAskPanelProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState(defaultPrompt)
  const [isLaunching, setIsLaunching] = useState(false)

  function openChat(nextPrompt = prompt, topic?: string) {
    setIsLaunching(true)
    const params = new URLSearchParams()
    const trimmed = nextPrompt.trim()

    const action = resolveCareHandoff(trimmed, topic || "coordinator")
    if (action && typeof window !== "undefined") {
      const stored = safeSessionSetItem(action.storageKey, JSON.stringify(action.payload))
      router.push(stored ? action.href : fallbackHrefForCareHandoff(action))
      return
    }

    if (trimmed) params.set("prompt", trimmed)
    if (topic) params.set("topic", topic)
    if (trimmed) params.set("autorun", "1")
    router.push(`/chat${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-5 sm:p-6",
        minimal && "p-3 sm:p-3",
        !minimal && "shadow-enterprise",
        className,
      )}
    >
      <div className="relative">
        {!minimal && (eyebrow || title || description) ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Bot size={11} />
              {eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Wallet size={10} className="text-primary" />
              On Base
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            minimal ? "grid gap-0" : "grid gap-5",
            showLanes && !compact && !minimal ? "xl:grid-cols-[1.1fr_0.9fr] xl:items-start" : "",
          )}
        >
          <div>
            {!minimal && title ? (
              <h2
                className={cn(
                  "max-w-3xl font-display font-semibold leading-[1.05] tracking-tight text-foreground",
                  compact
                    ? "text-[clamp(1.4rem,2.2vw,1.85rem)]"
                    : "text-[clamp(1.6rem,2.6vw,2.1rem)]",
                )}
              >
                {title}
              </h2>
            ) : null}
            {!minimal && description ? (
              <p className="mt-2.5 max-w-xl text-[14px] leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}

            <form
              className={cn(
                "overflow-hidden rounded-2xl border border-border/60 bg-background/55 backdrop-blur",
                !minimal && "mt-4",
                "shadow-glow-subtle focus-within:border-primary/60",
              )}
              onSubmit={(event) => {
                event.preventDefault()
                openChat()
              }}
            >
              <label htmlFor="basehealth-care-ask" className="sr-only">
                Ask BaseHealth
              </label>
              <textarea
                id="basehealth-care-ask"
                data-testid="care-ask-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={placeholder}
                rows={2}
                className="min-h-[88px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground/70 sm:px-4"
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-1">
                <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
                  Decision support — not a substitute for clinician judgment.
                </span>
                <button
                  type="submit"
                  data-testid="care-ask-submit"
                  disabled={isLaunching}
                  aria-label="Ask BaseHealth"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLaunching ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ArrowUp size={14} />
                  )}
                </button>
              </div>
            </form>

            <div className={cn("mt-3 flex flex-wrap gap-2", minimal && "justify-center")}>
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => openChat(suggestion.prompt, suggestion.topic)}
                  data-testid="care-ask-suggestion"
                  className="rounded-full border border-border/60 bg-background/50 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:border-primary/50 hover:bg-card/60 hover:text-foreground"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>

          {showLanes && !minimal ? (
            <div className={cn("grid gap-3", compact && "sm:grid-cols-3")}>
              {lanes.map((lane, index) => (
                <div
                  key={lane.label}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-primary">
                      <lane.icon size={15} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          0{index + 1}
                        </span>
                        <p className="text-[14px] font-semibold text-foreground">{lane.label}</p>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        {lane.detail}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export const careAskSuggestions = defaultSuggestions

export const dashboardCareAskSuggestions: CareAskSuggestion[] = [
  {
    label: "What is most urgent?",
    prompt: "Review my current care brief and tell me the one thing I should handle first.",
    topic: "coordinator",
  },
  {
    label: "Explain my labs",
    prompt: "Summarize my recent lab results in plain language and flag what I should ask my clinician.",
    topic: "coordinator",
  },
  {
    label: "Pay a $0.25 screening fee",
    prompt: "Start the screening assessment and complete the $0.25 USDC payment on Base.",
    topic: "payment",
  },
  {
    label: "Plan preventive care",
    prompt: "What screenings, vaccines, or preventive tasks should be considered for a 55-year-old man?",
    topic: "screening",
  },
]

export const patientBackgroundLanes: BackgroundLane[] = [
  {
    label: "Check the chart signals",
    detail:
      "BaseHealth looks across screenings, prescriptions, providers, and on-chain receipts.",
    icon: ClipboardList,
  },
  {
    label: "Answer in chat first",
    detail:
      "BaseHealth answers in chat with sources, then offers a handoff only when an action is needed.",
    icon: Sparkles,
  },
  {
    label: "Settle on Base when needed",
    detail:
      "Screening fees, second opinions, and care payments settle in USDC on Base — no card details required.",
    icon: Receipt,
  },
]
