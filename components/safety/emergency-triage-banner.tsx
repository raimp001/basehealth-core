"use client"

import { AlertTriangle, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const DISMISS_KEY = "basehealth:emergency-banner-dismissed"

/**
 * EmergencyTriageBanner
 *
 * Site-wide clinical safety banner. Always present unless the user dismisses
 * (per session). Reminds users that BaseHealth is decision support, not a
 * substitute for emergency care, and routes to /emergency for triage info.
 */
export function EmergencyTriageBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(DISMISS_KEY)
      setDismissed(stored === "1")
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  return (
    <div
      role="region"
      aria-label="Emergency safety notice"
      className="border-b border-destructive/30 bg-destructive/10 text-destructive"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden />
        <p className="flex-1 leading-snug">
          <span className="font-semibold">If this is a medical emergency, call 911</span> or go to the
          nearest emergency room.{" "}
          <Link href="/emergency" className="underline underline-offset-2 hover:no-underline">
            See red-flag symptoms
          </Link>
          . BaseHealth is decision support, not emergency care.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.sessionStorage.setItem(DISMISS_KEY, "1")
            } catch {
              /* ignore */
            }
            setDismissed(true)
          }}
          aria-label="Dismiss emergency safety notice"
          className="flex-shrink-0 rounded p-1 transition-colors hover:bg-destructive/20"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
