"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowDownLeft, ArrowUpRight, Copy, ExternalLink, Loader2, ShieldAlert, Wallet } from "lucide-react"
import { toast } from "sonner"
import { TreasuryTransfer } from "@/components/treasury/treasury-transfer"

type TreasuryBalancesResponse = {
  success: boolean
  generatedAt?: string
  error?: string
  help?: string
  network?: { name: string; chainId: number; explorer: string }
  treasuryAddress?: string
  balances?: {
    eth: { raw: string; formatted: string }
    usdc: { raw: string; formatted: string }
  }
}

type TreasuryActivityResponse = {
  success: boolean
  generatedAt?: string
  error?: string
  network?: { name: string; chainId: number; explorer: string; activityExplorer: string }
  treasuryAddress?: string
  summary?: {
    eventCount: number
    incomingNativeTransfers: number
    incomingTokenTransfers: number
    possibleTipsOrPayments: number
    hasUsdcTransfers: boolean
    latestIncomingAt: string | null
  }
  events?: Array<{
    id: string
    kind: "native-transfer" | "token-transfer"
    direction: "incoming" | "outgoing" | "self" | "unknown"
    asset: string
    amount: string
    amountUsd: string | null
    from: string | null
    to: string | null
    txHash: string
    timestamp: string | null
    status: string | null
    method: string | null
    explorerUrl: string
  }>
}

function formatAddress(address?: string | null) {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function TreasuryPage() {
  const [data, setData] = useState<TreasuryBalancesResponse | null>(null)
  const [activity, setActivity] = useState<TreasuryActivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)

  const explorerAddressUrl = useMemo(() => {
    if (!data?.network?.explorer || !data?.treasuryAddress) return null
    return `${data.network.explorer}/address/${data.treasuryAddress}`
  }, [data?.network?.explorer, data?.treasuryAddress])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setActivityLoading(true)
      try {
        const [balancesResult, activityResult] = await Promise.allSettled([
          fetch("/api/treasury/balances", { cache: "no-store" }),
          fetch("/api/treasury/activity?limit=8", { cache: "no-store" }),
        ])

        if (balancesResult.status === "fulfilled") {
          const json = (await balancesResult.value.json()) as TreasuryBalancesResponse
          setData(json)
        } else {
          setData({ success: false, error: "Failed to load treasury balances" })
        }

        if (activityResult.status === "fulfilled") {
          const json = (await activityResult.value.json()) as TreasuryActivityResponse
          setActivity(json)
        } else {
          setActivity({ success: false, error: "Failed to load treasury activity" })
        }
      } catch (error) {
        setData({ success: false, error: "Failed to load treasury balances" })
        setActivity({ success: false, error: "Failed to load treasury activity" })
      } finally {
        setLoading(false)
        setActivityLoading(false)
      }
    }

    load()
  }, [])

  const copy = async (value?: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success("Copied", { description: "Treasury address copied to clipboard." })
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground text-sm font-semibold mb-4">
            <Wallet className="h-4 w-4" />
            Treasury
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">App Funds on Base</h1>
          <p className="text-muted-foreground">
            This is the app-owned settlement wallet (configured via <code className="font-mono">NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS</code>).
          </p>
        </div>

        {!loading && data && !data.success && (
          <Alert variant="destructive" className="mb-6">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Not Ready</AlertTitle>
            <AlertDescription>
              {data.error}
              {data.help ? ` ${data.help}` : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Treasury Address</CardTitle>
              <CardDescription>Where Base Pay + USDC settlements land</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-mono text-sm text-foreground break-all">{data?.treasuryAddress || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => copy(data?.treasuryAddress)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {explorerAddressUrl && (
                        <Button asChild variant="outline" size="icon">
                          <a href={explorerAddressUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {data?.network && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {data.network.name} ({data.network.chainId})
                      </Badge>
                      <Badge variant="outline">Base Settlement</Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Read-only view from RPC</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">ETH</p>
                      <p className="text-lg font-semibold text-foreground">{data?.balances?.eth?.formatted || "0"}</p>
                    </div>
                    <Badge variant="outline">Gas</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">USDC</p>
                      <p className="text-lg font-semibold text-foreground">{data?.balances?.usdc?.formatted || "0"}</p>
                    </div>
                    <Badge variant="secondary">Settlement</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <TreasuryTransfer />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Base Activity</CardTitle>
            <CardDescription>Explorer-backed view of possible tips and payments to the treasury wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading activity...
              </div>
            ) : activity?.success ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Possible tips/payments</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {activity.summary?.possibleTipsOrPayments ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Incoming ETH</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {activity.summary?.incomingNativeTransfers ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Incoming USDC</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {activity.summary?.hasUsdcTransfers ? "Detected" : "None"}
                    </p>
                  </div>
                </div>

                {activity.events?.length ? (
                  <div className="space-y-2">
                    {activity.events.map((event) => (
                      <div key={event.id} className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border bg-muted/30">
                            {event.direction === "incoming" || event.direction === "self" ? (
                              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {event.direction === "incoming" || event.direction === "self" ? "Incoming" : "Outgoing"}{" "}
                              {event.asset}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Timestamp unavailable"} •{" "}
                              {formatAddress(event.from)} → {formatAddress(event.to)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {Number(event.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })} {event.asset}
                            </p>
                            {event.amountUsd && (
                              <p className="text-xs text-muted-foreground">~${event.amountUsd}</p>
                            )}
                          </div>
                          <Button asChild variant="outline" size="icon">
                            <a href={event.explorerUrl} target="_blank" rel="noreferrer" aria-label="Open transaction">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No treasury transfers were found by the explorer yet.
                  </p>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Activity unavailable</AlertTitle>
                <AlertDescription>{activity?.error || "Failed to load treasury activity"}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Refunds, Receipts, Agent Payments</CardTitle>
            <CardDescription>Operational shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/bookings">Manage bookings & refunds</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings">Receipt lookup</Link>
            </Button>
            <Button asChild>
              <Link href="/agents/billing">AI-agent billing (HTTP 402)</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
