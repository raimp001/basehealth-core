import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  FlaskConical,
  HeartHandshake,
  Search,
  Shield,
} from "lucide-react"

import { CareAskPanel } from "@/components/care-ask-panel"

type Feature = {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const features: Feature[] = [
  {
    title: "Health Screenings",
    description: "USPSTF Grade A & B recommendations tuned to your risk profile, fast.",
    href: "/screening",
    icon: Activity,
  },
  {
    title: "Provider Network",
    description: "Search NPI-verified clinicians and book care without guesswork.",
    href: "/providers/search",
    icon: Search,
  },
  {
    title: "Caregivers",
    description: "Find trusted support for elder care, post-surgery, and daily life.",
    href: "/caregivers/search",
    icon: HeartHandshake,
  },
  {
    title: "Clinical Trials",
    description: "AI matching from ClinicalTrials.gov with eligibility signals.",
    href: "/clinical-trials",
    icon: FlaskConical,
  },
]

const benefits = [
  "Wallet sign-in on Base",
  "Evidence-based screenings",
  "Provider search with direct fallback",
  "USDC checkout when needed",
]

const journeys = [
  {
    title: "Patients",
    description: "Start with one question, get screenings, find care, and keep the next step moving.",
    href: "/chat",
    cta: "Open assistant",
    icon: Bot,
  },
  {
    title: "Providers",
    description: "Join the network, get discovered by patients, and manage follow-through in one place.",
    href: "/join?role=provider",
    cta: "Join as provider",
    icon: Shield,
  },
  {
    title: "Caregivers",
    description: "Show availability, support families, and stay visible for urgent or ongoing help.",
    href: "/join?role=caregiver",
    cta: "Join as caregiver",
    icon: HeartHandshake,
  },
]

function FeatureCard({ title, description, href, icon: Icon }: Feature) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/35 backdrop-blur-md p-6 shadow-glow-subtle transition-all hover:border-border/80 hover:bg-card/45"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-gradient-radial from-primary/22 via-accent/10 to-transparent blur-2xl" />
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-background/30 shadow-glow-cyan">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/90 transition-all group-hover:gap-2">
            Open
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden pb-16 pt-4 md:pt-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-[0.55] [mask-image:radial-gradient(60%_60%_at_50%_18%,white,transparent)]" />
          <div className="absolute -top-56 left-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-gradient-radial from-primary/25 via-accent/10 to-transparent blur-3xl" />
          <div className="absolute -bottom-72 right-[-260px] h-[640px] w-[640px] rounded-full bg-gradient-radial from-accent/20 via-primary/10 to-transparent blur-3xl" />
        </div>

        <div id="ask-basehealth" className="relative mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/30 px-3 py-1 text-xs text-muted-foreground backdrop-blur animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow-cyan" />
                Care navigation, screening, and payments on Base
              </div>

              <h1 className="mt-6 text-balance font-display text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02] animate-fade-in-up">
                Start with
                <br />
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  one question
                </span>
                .
              </h1>

              <p className="mt-6 max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground animate-fade-in-up delay-100">
                BaseHealth turns one question into the next concrete step: screening, provider search, caregiver help,
                or research options. The patient experience stays simple while routing, payment, and coordination happen
                behind the scenes.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 flex-wrap animate-fade-in-up delay-200">
                <Link
                  href="#ask-basehealth"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm sm:text-base font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Ask BaseHealth
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/screening"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/25 backdrop-blur px-6 py-3 text-sm sm:text-base font-semibold text-foreground transition-colors hover:bg-card/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Start screening
                </Link>
                <Link
                  href="/payment/base"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/25 backdrop-blur px-6 py-3 text-sm sm:text-base font-semibold text-foreground transition-colors hover:bg-card/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Pay on Base
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-2 animate-fade-in-up delay-300">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/20 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-in-up delay-200">
              <CareAskPanel
                eyebrow="Ask BaseHealth"
                title="Ask once. Get the answer."
                description="Plain English in, evidence-based answer out. Care booking and payment settle on Base when you need them."
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Patients should not have to choose an agent — BaseHealth routes the work for you.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up delay-400">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Choose your path</h2>
              <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                One surface for patients, providers, and caregivers. Different jobs, same calm interface.
              </p>
            </div>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/90 hover:text-foreground transition-colors"
            >
              Open join flow <ArrowRight className="h-4 w-4 text-primary" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {journeys.map((item) => {
              const Icon = item.icon
              return (
              <div
                key={item.title}
                className="rounded-2xl border border-border/60 bg-card/25 backdrop-blur-md p-6 shadow-glow-subtle"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/50">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground/90 hover:text-foreground"
                >
                  {item.cta}
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Link>
              </div>
            )})}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/60">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/30 backdrop-blur-md p-8 md:p-10 shadow-enterprise">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-radial from-primary/18 via-accent/10 to-transparent blur-3xl" />
            </div>

            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl">
                <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Need a first next step?
                </h2>
                <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  Start with the assistant if you are unsure. Start with screening if you already want a plan. Start
                  with provider search if you are ready to book.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/chat"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow-cyan transition-colors hover:bg-primary/90"
                >
                  Open assistant <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/join"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/20 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card/35"
                >
                  Join BaseHealth
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-14">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/25 via-accent/10 to-transparent ring-1 ring-border/60 shadow-glow-subtle" />
                <div className="leading-none">
                  <p className="font-display text-base font-semibold tracking-tight">BaseHealth</p>
                  <p className="mt-1 text-xs text-muted-foreground">Healthcare intelligence for everyone.</p>
                </div>
              </Link>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Patients</h4>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link href="/screening" className="hover:text-foreground transition-colors">
                    Health screenings
                  </Link>
                </li>
                <li>
                  <Link href="/providers/search" className="hover:text-foreground transition-colors">
                    Find providers
                  </Link>
                </li>
                <li>
                  <Link href="/clinical-trials" className="hover:text-foreground transition-colors">
                    Clinical trials
                  </Link>
                </li>
                <li>
                  <Link href="/patient-portal" className="hover:text-foreground transition-colors">
                    Patient portal
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">Providers</h4>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link href="/onboarding?role=provider" className="hover:text-foreground transition-colors">
                    Provider signup
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding?role=caregiver" className="hover:text-foreground transition-colors">
                    Caregiver signup
                  </Link>
                </li>
                <li>
                  <Link href="/provider/dashboard" className="hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">
                <Link href="/company" className="hover:text-primary transition-colors">
                  Company
                </Link>
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-foreground transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-border/60 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">© 2026 BaseHealth. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>HIPAA mindful</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
