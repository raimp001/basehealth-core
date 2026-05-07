import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarClock } from "lucide-react"

import { AppointmentBookClient } from "./client"

export const metadata = {
  title: "Book a visit — BaseHealth",
  description:
    "Request a visit with a BaseHealth provider. We confirm by email and offer an on-chain receipt when payment is needed.",
}

export const dynamic = "force-dynamic"

export default function AppointmentBookPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/providers/search"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <CalendarClock className="h-3 w-3 text-primary" />
            Visit request
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={null}>
          <AppointmentBookClient />
        </Suspense>
      </main>
    </div>
  )
}
