"use client"

import { SectionHeader } from "@/components/health/section-header"
import { MedicationTracker } from "@/components/medications/medication-tracker"

export default function MedicationsPage() {
  return (
    <main className="container max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <SectionHeader
        eyebrow="Care · Medications"
        title="Your medications"
        description="Track active medications, daily adherence, and refill status — all in one place. Tap the circle each day to log a dose."
      />
      <MedicationTracker />
    </main>
  )
}
