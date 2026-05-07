import { Suspense } from "react"
import { DashboardClient } from "./client"

export const metadata = {
  title: "Dashboard | BaseHealth",
  description: "Your BaseHealth care dashboard — chat-first triage, recent screenings, scheduled visits, and on-chain receipts.",
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted/40" />
            <div className="mt-6 h-72 animate-pulse rounded-xl bg-muted/30" />
          </main>
        }
      >
        <DashboardClient />
      </Suspense>
    </div>
  )
}
