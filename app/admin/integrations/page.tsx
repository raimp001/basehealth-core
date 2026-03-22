"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type IntegrationStatusResponse = {
  success: boolean
  generatedAt?: string
  aiProvider?: string
  openclaw?: {
    gatewayUrlConfigured?: boolean
    gatewayUrlHost?: string | null
    gatewayAgentId?: string | null
    configurationIssue?: string | null
    reachable?: boolean | null
  }
  features?: {
    chatPaywallEnabled?: boolean
  }
  environment?: {
    nodeEnv?: string | null
    vercelEnv?: string | null
    vercelRegion?: string | null
    vercelUrl?: string | null
    gitCommitSha?: string | null
    gitCommitRef?: string | null
  }
  overallReady?: boolean
  network?: { name: string; chainId: number }
  sections?: Array<{
    id: string
    title: string
    ready: boolean
    checks: Array<{
      id: string
      label: string
      env?: string
      required: boolean
      passed: boolean
      help?: string
    }>
  }>
  error?: string
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Ready
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Needs setup
    </Badge>
  )
}

export default function IntegrationsAdminPage() {
  const [data, setData] = useState<IntegrationStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/base/integration-status", { cache: "no-store" })
        const json = (await res.json().catch(() => null)) as IntegrationStatusResponse | null
        setData(json)
      } catch (error) {
        setData({ success: false, error: "Failed to load integration status" })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const sections = useMemo(() => data?.sections || [], [data?.sections])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Integrations</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify sign-in, AI, Base payments, and attestations are configured in production.
              </p>
              {data?.generatedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last checked: {new Date(data.generatedAt).toLocaleString()}
                </p>
              ) : null}
              {data?.environment?.vercelUrl || data?.environment?.gitCommitSha ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Deployment: {data?.environment?.vercelUrl || "unknown"}
                  {data?.environment?.gitCommitSha ? ` · ${data.environment.gitCommitSha.slice(0, 7)}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {data?.environment?.vercelEnv ? (
                <Badge variant="outline">Vercel: {data.environment.vercelEnv}</Badge>
              ) : null}
              {typeof data?.features?.chatPaywallEnabled === "boolean" ? (
                <Badge variant="outline">Paywall: {data.features.chatPaywallEnabled ? "on" : "off"}</Badge>
              ) : null}
              {data?.aiProvider && data.aiProvider !== "none" ? (
                <Badge variant="secondary">AI: {data.aiProvider}</Badge>
              ) : null}
              {data?.network ? (
                <Badge variant="outline">
                  {data.network.name} ({data.network.chainId})
                </Badge>
              ) : null}
              {data?.openclaw?.gatewayUrlConfigured ? (
                <Badge variant="outline">OpenClaw host: {data.openclaw.gatewayUrlHost || "configured"}</Badge>
              ) : null}
              {typeof data?.overallReady === "boolean" ? <StatusBadge ok={Boolean(data.overallReady)} /> : null}
            </div>
          </div>
        </header>

        {loading && (
          <Card className="border-border shadow-sm">
            <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </CardContent>
          </Card>
        )}

        {!loading && data && data.success === false && (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Status unavailable</CardTitle>
              <CardDescription>{data.error || "Unknown error"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/admin">Back to admin</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && data?.success && (
          <div className="grid gap-4">
            {sections.map((section) => (
              <Card key={section.id} className="border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription>
                        {section.checks.filter((c) => c.passed).length}/{section.checks.length} checks passing
                      </CardDescription>
                    </div>
                    <StatusBadge ok={section.ready} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {section.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{check.label}</p>
                        {check.env ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Env: <span className="font-mono">{check.env}</span>
                            {check.required ? " (required)" : ""}
                          </p>
                        ) : null}
                        {check.help ? <p className="mt-1 text-xs text-muted-foreground">{check.help}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={check.passed ? "secondary" : "outline"}>{check.passed ? "OK" : "Missing"}</Badge>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Set missing environment variables in Vercel (Production) and redeploy. For AI, set one of{" "}
                    <span className="font-mono">OPENCLAW_API_KEY</span> or{" "}
                    <span className="font-mono">OPENCLAW_GATEWAY_TOKEN</span> or{" "}
                    <span className="font-mono">OPENCLAW_GATEWAY_PASSWORD</span> plus a reachable{" "}
                    <span className="font-mono">OPENCLAW_GATEWAY_URL</span> for remote deployments, or use{" "}
                    <span className="font-mono">OPENAI_API_KEY</span> or <span className="font-mono">GROQ_API_KEY</span>.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
