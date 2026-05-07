import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, Wallet } from "lucide-react"

import { BasePayLanding } from "./client"

export const metadata = {
  title: "Pay on Base — BaseHealth",
  description:
    "One-tap USDC payments on Base for screening, second opinions, and care services. Settles in seconds with FaceID or passkey.",
}

export default function BasePaymentPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            BaseHealth
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Wallet className="h-3 w-3 text-primary" />
            On Base
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={null}>
          <BasePayLanding />
        </Suspense>
      </main>
    </div>
  )
}
