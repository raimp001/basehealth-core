"use client"

import Link from "next/link"
import {
  Pill,
  CalendarCheck2,
  ShieldCheck,
  ShoppingBag,
  NotebookPen,
  Activity,
  ChevronRight,
  Stethoscope,
  Search,
  FlaskConical,
  Bot,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SectionHeader } from "@/components/health/section-header"

type Tile = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  accent?: string
}

const careTiles: Tile[] = [
  {
    href: "/medications",
    icon: Pill,
    label: "Medications",
    description: "Active meds, dosing schedule, adherence, refills.",
    accent: "from-cyan-500/15 to-transparent",
  },
  {
    href: "/medications/order",
    icon: ShoppingBag,
    label: "Order medications",
    description: "Search the formulary and pay in USDC on Base.",
    accent: "from-emerald-500/15 to-transparent",
  },
  {
    href: "/journal",
    icon: NotebookPen,
    label: "Health journal",
    description: "Daily symptoms, vitals, mood, and free notes.",
    accent: "from-purple-500/15 to-transparent",
  },
  {
    href: "/screening/milestones",
    icon: CalendarCheck2,
    label: "Screening milestones",
    description: "Overdue, coming up, and completed screenings.",
    accent: "from-amber-500/15 to-transparent",
  },
  {
    href: "/screening",
    icon: ShieldCheck,
    label: "Screening assessment",
    description: "USPSTF-driven personalized recommendations.",
    accent: "from-rose-500/15 to-transparent",
  },
  {
    href: "/health-insights",
    icon: Activity,
    label: "Health insights",
    description: "AI-driven trends across your records.",
    accent: "from-blue-500/15 to-transparent",
  },
]

const networkTiles: Tile[] = [
  {
    href: "/providers/search",
    icon: Search,
    label: "Find care",
    description: "Search providers by specialty and location.",
  },
  {
    href: "/clinical-trials",
    icon: FlaskConical,
    label: "Clinical trials",
    description: "Find matching trials at top centers.",
  },
  {
    href: "/chat",
    icon: Bot,
    label: "AI assistant",
    description: "Ask anything; cites peer-reviewed sources.",
  },
  {
    href: "/appointments",
    icon: Stethoscope,
    label: "Appointments",
    description: "Past visits and upcoming bookings.",
  },
]

export default function CareDashboardPage() {
  return (
    <main className="container max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      <SectionHeader
        eyebrow="Your care hub"
        title="Welcome back"
        description="Everything you need to manage your health, in one place. Track medications, log how you're feeling, and stay on top of preventive screenings."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Care
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {careTiles.map((t) => (
            <DashboardTile key={t.href} tile={t} />
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Network
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {networkTiles.map((t) => (
            <DashboardTile key={t.href} tile={t} compact />
          ))}
        </div>
      </section>
    </main>
  )
}

function DashboardTile({ tile, compact }: { tile: Tile; compact?: boolean }) {
  const Icon = tile.icon
  return (
    <Link
      href={tile.href}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 rounded-xl"
    >
      <Card className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors h-full">
        <CardContent className={compact ? "p-4" : "p-5"}>
          <div className="flex items-start gap-3">
            <span
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 bg-gradient-to-br ${
                tile.accent ?? "from-card/60 to-transparent"
              }`}
            >
              <Icon className="h-5 w-5 text-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-foreground truncate">
                  {tile.label}
                </h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className={`mt-1 text-${compact ? "xs" : "sm"} text-muted-foreground leading-relaxed`}>
                {tile.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
