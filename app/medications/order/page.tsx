"use client"

import { Suspense } from "react"
import { SectionHeader } from "@/components/health/section-header"
import { MedicationOrderFlow } from "@/components/medications/order-flow"

export default function MedicationOrderPage() {
  return (
    <main className="container max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <SectionHeader
        eyebrow="Care · Order medications"
        title="Order medications"
        description="Search the formulary, add to cart, choose a pharmacy, and pay in USDC on Base. Prescription items are routed to your pharmacy automatically."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <MedicationOrderFlow />
      </Suspense>
    </main>
  )
}
