"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Bot, CheckCircle2, Clock3, Loader2, Play, RefreshCw, Server } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ProviderPreference = "openclaw-first" | "openai-first" | "groq-first"
type ExecutionTarget = "local" | "aws-sqs"
type CodeChangeMode = "report-only" | "patch-artifacts"
type RunStatus = "queued" | "running" | "completed" | "failed"

type RunSummary = {
  id: string
  goal: string
  status: RunStatus
  createdAt: string
  startedAt?: string
  finishedAt?: string
  providerResolved?: string
  modelResolved?: string | null
  iterationCount: number
  dispatchTarget?: ExecutionTarget
  patchAvailable?: boolean
  error?: string
}

type RunDetail = RunSummary & {
  workspaceSummary?: string
  reportMarkdown?: string
  reportPath?: string
  settings: {
    providerPreference: ProviderPreference
    executionTarget: ExecutionTarget
    codeChangeMode: CodeChangeMode
    maxIterations: number
    maxPatchFiles: number
    evaluationCommand?: string
  }
  dispatch?: {
    target: ExecutionTarget
    status: "queued" | "processing" | "completed" | "failed"
    queuedAt: string
    messageId?: string
    requestKey?: string
    runKey?: string
    reportKey?: string
    patchKey?: string
    workerLogGroup?: string | null
    lastSyncedAt?: string
  }
  patchArtifact?: {
    path: string
    preview: string
    fileCount: number
    generatedAt: string
    applyEnabled: boolean
    appliedAt?: string
    applyOutput?: string
    s3Key?: string
  }
  iterations: Array<{
    index: number
    provider: string
    model?: string | null
    status: string
    observations: string[]
    hypotheses: string[]
    recommendedExperiments: string[]
    proposedChanges: Array<{ file: string; change: string; rationale: string }>
    operatorSummary: string
    error?: string
    diagnostics: {
      gitStatus: string
      gitDiffStat: string
      evaluationCommand?: string
      evaluationOutput?: string
      evaluationExitCode?: number | null
    }
  }>
  error?: string
}

type DashboardData = {
  success: boolean
  config: {
    runtime: "local" | "remote"
    localWorkerEnabled: boolean
    stateDir: string
    workspaceDir: string
    openclawGatewayUrl: string
    openclawConfigured: boolean
    openaiConfigured: boolean
    groqConfigured: boolean
    autoApplyEnabled: boolean
    aws: {
      region: string | null
      sqsQueueUrl: string | null
      s3Bucket: string | null
      s3Prefix: string
      ecsCluster: string | null
      ecsService: string | null
      ecsTaskDefinition: string | null
      cloudWatchLogGroup: string | null
      configured: boolean
    }
  }
  program: string
  settings: {
    providerPreference: ProviderPreference
    executionTarget: ExecutionTarget
    codeChangeMode: CodeChangeMode
    maxIterations: number
    maxPatchFiles: number
    evaluationCommand?: string
  }
  runs: RunSummary[]
  activeRunIds: string[]
  error?: string
}

function statusVariant(status: RunStatus): "success" | "warning" | "error" | "outline" {
  switch (status) {
    case "completed":
      return "success"
    case "running":
    case "queued":
      return "warning"
    case "failed":
      return "error"
    default:
      return "outline"
  }
}

export function ResearchDashboard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [data, setData] = useState<DashboardData | null>(null)
  const [program, setProgram] = useState("")
  const [providerPreference, setProviderPreference] = useState<ProviderPreference>("openclaw-first")
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget>("local")
  const [codeChangeMode, setCodeChangeMode] = useState<CodeChangeMode>("report-only")
  const [maxIterations, setMaxIterations] = useState("2")
  const [maxPatchFiles, setMaxPatchFiles] = useState("2")
  const [evaluationCommand, setEvaluationCommand] = useState("")
  const [goal, setGoal] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null)
  const [dirty, setDirty] = useState(false)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/research", { cache: "no-store" })
      const json = (await res.json()) as DashboardData
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load auto-research dashboard")
      }

      setData(json)
      if (!dirty) {
        setProgram(json.program)
        setProviderPreference(json.settings.providerPreference)
        setExecutionTarget(json.settings.executionTarget)
        setCodeChangeMode(json.settings.codeChangeMode)
        setMaxIterations(String(json.settings.maxIterations))
        setMaxPatchFiles(String(json.settings.maxPatchFiles))
        setEvaluationCommand(json.settings.evaluationCommand || "")
      }

      if (!selectedRunId && json.runs[0]) {
        setSelectedRunId(json.runs[0].id)
      }
      setError(null)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [dirty, selectedRunId])

  const loadRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/admin/research/runs/${runId}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load run")
      }
      setSelectedRun(json.run)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, refreshToken])

  useEffect(() => {
    if (selectedRunId) {
      loadRun(selectedRunId)
    } else {
      setSelectedRun(null)
    }
  }, [selectedRunId, loadRun, refreshToken])

  useEffect(() => {
    const shouldPoll = Boolean(data?.activeRunIds?.length) || Boolean(data?.runs.some((run) => run.dispatchTarget === "aws-sqs" && (run.status === "queued" || run.status === "running")))
    if (!shouldPoll) return

    const timer = window.setInterval(() => {
      setRefreshToken((value) => value + 1)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [data?.activeRunIds, data?.runs])

  const selectedRunSummary = useMemo(
    () => data?.runs.find((run) => run.id === selectedRunId) || null,
    [data?.runs, selectedRunId],
  )

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program,
          settings: {
            providerPreference,
            executionTarget,
            codeChangeMode,
            maxIterations: Number(maxIterations) || 2,
            maxPatchFiles: Number(maxPatchFiles) || 2,
            evaluationCommand,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save auto-research settings")
      }
      setDirty(false)
      setMessage("Program and settings saved.")
      setRefreshToken((value) => value + 1)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const startRun = async () => {
    if (!goal.trim()) {
      setError("Enter a run goal before starting the worker.")
      return
    }

    setStarting(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/research/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          settings: {
            providerPreference,
            executionTarget,
            codeChangeMode,
            maxIterations: Number(maxIterations) || 2,
            maxPatchFiles: Number(maxPatchFiles) || 2,
            evaluationCommand,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to start auto-research run")
      }
      setGoal("")
      setSelectedRunId(json.run.id)
      setMessage(executionTarget === "aws-sqs" ? "Auto-research run queued to AWS." : "Auto-research run started.")
      setRefreshToken((value) => value + 1)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStarting(false)
    }
  }

  const applyPatch = async () => {
    if (!selectedRunId) return

    setApplying(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/research/runs/${selectedRunId}/apply`, { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to apply patch")
      }
      setMessage("Patch artifact applied to the local workspace.")
      setRefreshToken((value) => value + 1)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="py-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading auto-research…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Auto-Research Worker</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
            Local-first operator loop with an AWS queue path. Runs persist program state, history, reports, and optional
            patch artifacts for operator review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-red-500/40">
          <CardContent className="py-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      {message ? (
        <Card className="border-emerald-500/40">
          <CardContent className="py-4 text-sm text-emerald-200">{message}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Mode</span>
              <Badge variant={data?.config.localWorkerEnabled ? "success" : "warning"}>{data?.config.runtime}</Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Local worker</span>
              <Badge variant={data?.config.localWorkerEnabled ? "success" : "outline"}>
                {data?.config.localWorkerEnabled ? "Available" : "Disabled"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">State dir: {data?.config.stateDir}</p>
            <p className="text-xs text-muted-foreground break-all">Workspace dir: {data?.config.workspaceDir}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={data?.config.openclawConfigured ? "success" : "outline"}>OpenClaw</Badge>
              <Badge variant={data?.config.openaiConfigured ? "success" : "outline"}>OpenAI</Badge>
              <Badge variant={data?.config.groqConfigured ? "success" : "outline"}>Groq</Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">Gateway: {data?.config.openclawGatewayUrl}</p>
            <p className="text-xs text-muted-foreground">
              Provider order is configurable and local/AWS execution share the same model fallback chain.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              AWS Path
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Configured</span>
              <Badge variant={data?.config.aws.configured ? "success" : "outline"}>{data?.config.aws.configured ? "Ready" : "Missing env"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">Region: {data?.config.aws.region || "not set"}</p>
            <p className="text-xs text-muted-foreground break-all">Queue: {data?.config.aws.sqsQueueUrl || "not set"}</p>
            <p className="text-xs text-muted-foreground break-all">Bucket: {data?.config.aws.s3Bucket || "not set"}</p>
            <p className="text-xs text-muted-foreground break-all">Log group: {data?.config.aws.cloudWatchLogGroup || "not set"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Patch Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Auto-apply</span>
              <Badge variant={data?.config.autoApplyEnabled ? "warning" : "outline"}>{data?.config.autoApplyEnabled ? "Enabled" : "Disabled"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Patch artifacts can be generated for review. Applying them requires <code className="font-mono">CLAWDBOT_ALLOW_AUTO_APPLY=true</code> on a local runtime.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Program & settings</CardTitle>
            <CardDescription>Program instructions persist to disk so the loop stays stable across sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autoresearch-program">Program</Label>
              <Textarea
                id="autoresearch-program"
                value={program}
                onChange={(event) => {
                  setProgram(event.target.value)
                  setDirty(true)
                }}
                className="min-h-[260px]"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Provider order</Label>
                <Select value={providerPreference} onValueChange={(value: ProviderPreference) => { setProviderPreference(value); setDirty(true) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openclaw-first">OpenClaw first</SelectItem>
                    <SelectItem value="openai-first">OpenAI first</SelectItem>
                    <SelectItem value="groq-first">Groq first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Execution target</Label>
                <Select value={executionTarget} onValueChange={(value: ExecutionTarget) => { setExecutionTarget(value); setDirty(true) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local worker</SelectItem>
                    <SelectItem value="aws-sqs">AWS queue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Code change mode</Label>
                <Select value={codeChangeMode} onValueChange={(value: CodeChangeMode) => { setCodeChangeMode(value); setDirty(true) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report-only">Report only</SelectItem>
                    <SelectItem value="patch-artifacts">Generate patch artifacts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-iterations">Max iterations</Label>
                <Input id="max-iterations" type="number" min={1} max={5} value={maxIterations} onChange={(event) => { setMaxIterations(event.target.value); setDirty(true) }} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-patch-files">Max patch files</Label>
                <Input id="max-patch-files" type="number" min={1} max={3} value={maxPatchFiles} onChange={(event) => { setMaxPatchFiles(event.target.value); setDirty(true) }} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evaluation-command">Evaluation command</Label>
                <Input id="evaluation-command" value={evaluationCommand} onChange={(event) => { setEvaluationCommand(event.target.value); setDirty(true) }} placeholder="npm run test -- tests/lib/..." />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border border-border rounded-xl p-4">
              <p className="text-sm text-muted-foreground">
                Local mode executes immediately. AWS mode queues the run to SQS and stores manifests/artifacts in S3.
              </p>
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start a run</CardTitle>
            <CardDescription>Use one specific objective per run so the loop stays easy to evaluate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="run-goal">Run goal</Label>
              <Textarea
                id="run-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="min-h-[160px]"
                placeholder="Example: audit wallet sign-in friction, assistant reliability, billing/refund edge cases, and propose the highest-leverage next changes."
              />
            </div>

            <Button className="w-full" onClick={startRun} disabled={starting || (executionTarget === "local" && !data?.config.localWorkerEnabled)}>
              {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {executionTarget === "aws-sqs" ? "Queue AWS run" : "Start local worker"}
            </Button>

            {executionTarget === "local" && !data?.config.localWorkerEnabled ? (
              <p className="text-xs text-amber-200">
                Local execution is disabled on remote/Vercel deployments because serverless instances cannot host a stable worker loop.
              </p>
            ) : null}

            {executionTarget === "aws-sqs" && !data?.config.aws.configured ? (
              <p className="text-xs text-amber-200">
                AWS queue execution needs <code className="font-mono">AWS_REGION</code>, <code className="font-mono">CLAWDBOT_AWS_SQS_QUEUE_URL</code>, and <code className="font-mono">CLAWDBOT_AWS_S3_BUCKET</code>.
              </p>
            ) : null}

            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Current execution model</p>
              <ul className="mt-2 space-y-2 list-disc list-inside">
                <li>One local run at a time</li>
                <li>AWS path uses SQS + ECS/Fargate worker + S3 artifacts + CloudWatch logs</li>
                <li>Patch artifacts are off by default and never auto-apply unless explicitly enabled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run history</CardTitle>
            <CardDescription>Recent executions, newest first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.runs?.length ? (
              data.runs.map((run) => {
                const active = data.activeRunIds.includes(run.id)
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedRunId === run.id ? "border-primary bg-primary/5" : "border-border bg-background/40"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{run.goal}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {active ? <Clock3 className="h-4 w-4 text-amber-300 animate-pulse" /> : null}
                        <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Iterations: {run.iterationCount}</span>
                      {run.dispatchTarget ? <span>Target: {run.dispatchTarget}</span> : null}
                      {run.providerResolved ? <span>Provider: {run.providerResolved}</span> : null}
                      {run.modelResolved ? <span>Model: {run.modelResolved}</span> : null}
                      {run.patchAvailable ? <span>Patch artifact ready</span> : null}
                    </div>
                    {run.error ? <p className="mt-2 text-xs text-red-200">{run.error}</p> : null}
                  </button>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run detail</CardTitle>
            <CardDescription>
              {selectedRunSummary ? `Selected run ${selectedRunSummary.id}` : "Choose a run to inspect its findings."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRun ? (
              <p className="text-sm text-muted-foreground">No run selected.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(selectedRun.status)}>{selectedRun.status}</Badge>
                  {selectedRun.dispatch?.target ? <Badge variant="outline">{selectedRun.dispatch.target}</Badge> : null}
                  {selectedRun.providerResolved ? <Badge variant="outline">{selectedRun.providerResolved}</Badge> : null}
                  {selectedRun.modelResolved ? <Badge variant="outline">{selectedRun.modelResolved}</Badge> : null}
                </div>

                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-muted-foreground">Goal</p>
                    <p className="mt-1 text-foreground">{selectedRun.goal}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-muted-foreground">Created</p>
                    <p className="mt-1 text-foreground">{new Date(selectedRun.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-muted-foreground">Iterations</p>
                    <p className="mt-1 text-foreground">{selectedRun.iterations.length}</p>
                  </div>
                </div>

                {selectedRun.dispatch ? (
                  <div className="rounded-xl border border-border p-4 text-sm space-y-2">
                    <p className="font-medium text-foreground">Dispatch</p>
                    <p className="text-muted-foreground">Status: {selectedRun.dispatch.status}</p>
                    <p className="text-muted-foreground break-all">Request key: {selectedRun.dispatch.requestKey || "none"}</p>
                    <p className="text-muted-foreground break-all">Run key: {selectedRun.dispatch.runKey || "none"}</p>
                    <p className="text-muted-foreground break-all">Report key: {selectedRun.dispatch.reportKey || "none"}</p>
                    <p className="text-muted-foreground break-all">Patch key: {selectedRun.dispatch.patchKey || "none"}</p>
                    <p className="text-muted-foreground break-all">Worker log group: {selectedRun.dispatch.workerLogGroup || "none"}</p>
                  </div>
                ) : null}

                {selectedRun.patchArtifact ? (
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">Patch artifact</p>
                        <p className="text-xs text-muted-foreground break-all">{selectedRun.patchArtifact.path}</p>
                      </div>
                      {selectedRun.patchArtifact.applyEnabled && !selectedRun.patchArtifact.appliedAt ? (
                        <Button size="sm" onClick={applyPatch} disabled={applying}>
                          {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Apply patch
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">Files: {selectedRun.patchArtifact.fileCount}</p>
                    <p className="text-xs text-muted-foreground">Generated: {new Date(selectedRun.patchArtifact.generatedAt).toLocaleString()}</p>
                    {selectedRun.patchArtifact.appliedAt ? (
                      <p className="text-xs text-emerald-200">Applied: {new Date(selectedRun.patchArtifact.appliedAt).toLocaleString()}</p>
                    ) : null}
                    {selectedRun.patchArtifact.s3Key ? <p className="text-xs text-muted-foreground break-all">S3 key: {selectedRun.patchArtifact.s3Key}</p> : null}
                    {selectedRun.patchArtifact.applyOutput ? (
                      <pre className="overflow-x-auto rounded-lg border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        {selectedRun.patchArtifact.applyOutput}
                      </pre>
                    ) : null}
                    <pre className="overflow-x-auto rounded-lg border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                      {selectedRun.patchArtifact.preview}
                    </pre>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {selectedRun.iterations.map((iteration) => (
                    <div key={iteration.index} className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">Iteration {iteration.index}</p>
                        <Badge variant={iteration.status === "completed" ? "success" : "error"}>{iteration.provider}</Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">Observations</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                            {iteration.observations.map((value, index) => (
                              <li key={index}>{value}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Hypotheses</p>
                          <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                            {iteration.hypotheses.map((value, index) => (
                              <li key={index}>{value}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Recommended experiments</p>
                        <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                          {iteration.recommendedExperiments.map((value, index) => (
                            <li key={index}>{value}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Proposed changes</p>
                        {iteration.proposedChanges.length ? (
                          <ul className="mt-2 space-y-2 text-muted-foreground">
                            {iteration.proposedChanges.map((change, index) => (
                              <li key={index} className="rounded-lg border border-border p-3">
                                <p className="font-mono text-xs text-foreground">{change.file}</p>
                                <p className="mt-1 text-sm">{change.change}</p>
                                <p className="mt-1 text-xs">{change.rationale}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">No file-level changes proposed.</p>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Operator summary</p>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{iteration.operatorSummary}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="font-medium text-foreground">Git status</p>
                          <pre className="mt-2 overflow-x-auto rounded-lg border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                            {iteration.diagnostics.gitStatus || "No git status captured."}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Git diff stat</p>
                          <pre className="mt-2 overflow-x-auto rounded-lg border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                            {iteration.diagnostics.gitDiffStat || "No diff stat captured."}
                          </pre>
                        </div>
                      </div>
                      {iteration.diagnostics.evaluationCommand ? (
                        <div>
                          <p className="font-medium text-foreground">
                            Evaluation command: <span className="font-mono text-xs text-muted-foreground">{iteration.diagnostics.evaluationCommand}</span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">Exit code: {iteration.diagnostics.evaluationExitCode ?? "unknown"}</p>
                          <pre className="mt-2 overflow-x-auto rounded-lg border border-border p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                            {iteration.diagnostics.evaluationOutput || "No evaluation output captured."}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {selectedRun.reportMarkdown ? (
                  <div>
                    <p className="font-medium text-foreground mb-2">Report artifact</p>
                    <pre className="overflow-x-auto rounded-xl border border-border p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                      {selectedRun.reportMarkdown}
                    </pre>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
