"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowRight, BadgeCheck, HeartHandshake, Shield, Stethoscope, Wallet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type JoinRole = "provider" | "caregiver"

const ROLE_CARDS: Array<{
  role: JoinRole
  title: string
  description: string
  href: string
  icon: typeof Stethoscope
  bullets: string[]
}> = [
  {
    role: "provider",
    title: "Provider",
    description: "Physicians, NPs/PAs, therapists, and other licensed clinicians.",
    href: "/onboarding?role=provider",
    icon: Stethoscope,
    bullets: [
      "Credential review before search visibility",
      "Wallet-ready payouts and Base settlements",
      "One place for discovery, follow-through, and billing",
    ],
  },
  {
    role: "caregiver",
    title: "Caregiver",
    description: "Home care, post-surgery support, companionship, and daily assistance.",
    href: "/onboarding?role=caregiver",
    icon: HeartHandshake,
    bullets: [
      "Experience review with optional background checks",
      "Visible to families searching for local support",
      "Structured scheduling and payment workflow",
    ],
  },
]

export default function JoinPage() {
  const searchParams = useSearchParams()
  const requestedRole = searchParams.get("role")
  const selectedRole: JoinRole | null = requestedRole === "provider" || requestedRole === "caregiver" ? requestedRole : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Join BaseHealth</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              Join the network,
              <br />
              <span className="text-muted-foreground">stay discoverable.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              BaseHealth keeps the patient experience simple, then routes care to the right provider or caregiver behind
              the scenes. Apply once, get verified, and stay ready for search, scheduling, and payment.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Verified before listing",
                body: "We review credentials or experience before making profiles visible in search.",
                icon: Shield,
              },
              {
                title: "Wallet-aware payouts",
                body: "Base-compatible payments can route to your connected wallet when enabled.",
                icon: Wallet,
              },
              {
                title: "One shared workflow",
                body: "Patients ask once. BaseHealth handles routing, follow-through, and payment flow.",
                icon: BadgeCheck,
              },
            ].map((item) => (
              <Card key={item.title} className="bg-card/25">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/50">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon
            const isSelected = selectedRole === card.role
            return (
              <Card
                key={card.role}
                className={isSelected ? "border-primary/50 bg-card/45 shadow-enterprise" : "bg-card/25"}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {card.title}
                      </CardTitle>
                      <CardDescription className="mt-2">{card.description}</CardDescription>
                    </div>
                    {isSelected ? <Badge>Selected</Badge> : <Badge variant="outline">Apply</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/80" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full">
                    <Link href={card.href}>
                      Start {card.role} application
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="bg-card/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Already started?</CardTitle>
              <CardDescription>Resume an existing application or check review status.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline">
                <Link href="/onboarding/status">
                  Track application status
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/onboarding">Open onboarding</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">For patients</CardTitle>
              <CardDescription>
                Patients should stay in one assistant and one search flow, not choose internal agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/chat">Open assistant</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/providers/search">Find care</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
