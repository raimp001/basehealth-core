"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Lock, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OPENCLAW_AGENT_CATALOG, OPENCLAW_AGENT_IDS } from "@/lib/openclaw-agent-catalog"

function isOpsEnabledFromParams(searchParams: ReturnType<typeof useSearchParams>) {
  const ops = searchParams.get("ops")
  return ops === "1"
}

function isOpsEnabledFromStorage() {
  try {
    return window.localStorage.getItem("basehealth_ops") === "1"
  } catch {
    return false
  }
}

export default function AgentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [opsEnabled, setOpsEnabled] = useState(false)

  useEffect(() => {
    const enabled = isOpsEnabledFromParams(searchParams) || isOpsEnabledFromStorage()
    setOpsEnabled(enabled)
  }, [searchParams])

  const agents = useMemo(() => OPENCLAW_AGENT_IDS.map((id) => ({ id, ...OPENCLAW_AGENT_CATALOG[id] })), [])

  if (!opsEnabled) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
          <Card className="bg-card/20">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Routing console</CardTitle>
                  <CardDescription>
                    Normal users should stay in Assistant. Internal specialists route behind the scenes.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3.5 w-3.5" />
                  Ops only
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Public surface</p>
                  <p className="mt-1 text-muted-foreground">Patients ask once in chat. They should not choose specialists manually.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Internal routing</p>
                  <p className="mt-1 text-muted-foreground">Routing decides whether the next step is screening, care search, billing, or admin work.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Operator use</p>
                  <p className="mt-1 text-muted-foreground">Use this page only for QA, forced launches, and routing validation.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/chat">Go to assistant</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      window.localStorage.setItem("basehealth_ops", "1")
                    } catch {
                      // ignore
                    }
                    router.replace("/agents?ops=1")
                  }}
                >
                  Enable ops mode
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ops</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">Routing console</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Internal operator workspace for testing specialist launches and routing assumptions. Public users should
                stay in <Link href="/chat" className="text-primary hover:underline underline-offset-4">Assistant</Link>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/chat?ops=1">Open assistant (ops)</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  try {
                    window.localStorage.removeItem("basehealth_ops")
                  } catch {
                    // ignore
                  }
                  router.replace("/chat")
                }}
              >
                Exit ops mode
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-3 mb-6">
          {[
            {
              title: "Default path",
              body: "Patients should enter through chat, screening, or search, not by specialist name.",
            },
            {
              title: "Force launch",
              body: "Use this page only when you need to pin a specific specialist for QA or debugging.",
            },
            {
              title: "Routing goal",
              body: "Keep the visible experience simple while internal agents coordinate without duplicate work.",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-card/20">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {agents.map((agent) => {
            const launchHref = `/chat?ops=1&agent=${agent.id}&q=${encodeURIComponent(agent.launchPrompt)}`
            return (
              <Card key={agent.id} className="bg-card/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{agent.label}</CardTitle>
                      <CardDescription className="mt-2">{agent.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{agent.functionArea}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {agent.keywords.slice(0, 4).map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                    <div className="flex items-start gap-3">
                      <Workflow className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Launch prompt</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{agent.launchPrompt}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="sm:flex-1">
                      <Link href={launchHref}>
                        Launch specialist
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="sm:flex-1">
                      <Link href={agent.workflowHref}>{agent.workflowLabel}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
