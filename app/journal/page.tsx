"use client"

import { SectionHeader } from "@/components/health/section-header"
import { HealthJournal } from "@/components/health/health-journal"

export default function JournalPage() {
  return (
    <main className="container max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <SectionHeader
        eyebrow="Care · Journal"
        title="Health journal"
        description="A daily timeline of how you're feeling — symptoms, vitals, mood, and free-form notes. Useful to share with your provider or to spot patterns."
      />
      <HealthJournal />
    </main>
  )
}
