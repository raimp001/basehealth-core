"use client"

import { SectionHeader } from "@/components/health/section-header"
import { ScreeningMilestones } from "@/components/health/screening-milestones"

export default function ScreeningMilestonesPage() {
  return (
    <main className="container max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <SectionHeader
        eyebrow="Care · Screening"
        title="Screening milestones"
        description="Stay current on preventive screenings. We organize your care into what's overdue, coming up, and completed — based on USPSTF and specialty guidelines."
      />
      <ScreeningMilestones />
    </main>
  )
}
