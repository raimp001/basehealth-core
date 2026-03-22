"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, HeartHandshake, Shield, Zap } from "lucide-react"
import { BasePayCheckout } from "@/components/checkout/base-pay-checkout"
import { EthTipCheckout } from "@/components/tips/eth-tip-checkout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { basePayConfig } from "@/lib/base-pay-service"

const PRESET_TIPS = [0.25, 1, 5, 10, 25]

export default function SupportPage() {
  const [amount, setAmount] = useState<number>(1)
  const [customAmount, setCustomAmount] = useState<string>("")
  const [orderId, setOrderId] = useState(() => `tip-${Date.now()}`)

  const resolvedAmount = useMemo(() => {
    const parsed = Number.parseFloat(customAmount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return amount
  }, [amount, customAmount])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-10">
        <header className="mb-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Support growth</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-balance">
              Fund the product,
              <br />
              <span className="text-muted-foreground">not more clutter.</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              Tips help fund inference, care-routing improvements, billing automation, and safer patient UX. Support can
              be sent with USDC on Base or ETH on Base.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              Fast Base settlement
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Wallet-native checkout
            </Badge>
            <Badge variant="outline" className="gap-1">
              <HeartHandshake className="h-3 w-3" />
              Optional support, not required to browse
            </Badge>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="bg-card/25">
            <CardHeader>
              <CardTitle className="text-xl">Choose an amount</CardTitle>
              <CardDescription>
                Keep this separate from personal health details. Tips support product operations, not clinical advice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {PRESET_TIPS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={amount === value && !customAmount ? "default" : "outline"}
                    onClick={() => {
                      setCustomAmount("")
                      setAmount(value)
                    }}
                  >
                    ${value.toFixed(value < 1 ? 2 : 0)}
                  </Button>
                ))}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-foreground">Custom amount (USD)</label>
                <Input
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="e.g. 3.00"
                  inputMode="decimal"
                />
                <p className="text-xs text-muted-foreground">
                  Destination treasury wallet: <span className="font-mono">{basePayConfig.recipientAddress}</span>
                </p>
              </div>

              <Tabs defaultValue="usdc" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="usdc">USDC (Base Pay)</TabsTrigger>
                  <TabsTrigger value="eth">ETH on Base</TabsTrigger>
                </TabsList>

                <TabsContent value="usdc" className="pt-3">
                  <BasePayCheckout
                    amount={resolvedAmount}
                    serviceName="Support tip"
                    serviceDescription="Tip to support BaseHealth development"
                    providerName="BaseHealth"
                    providerWallet={basePayConfig.recipientAddress}
                    orderId={orderId}
                    providerId="basehealth"
                    collectEmail={false}
                    onSuccess={() => {
                      setOrderId(`tip-${Date.now()}`)
                    }}
                  />
                </TabsContent>

                <TabsContent value="eth" className="pt-3">
                  <EthTipCheckout
                    usdAmount={resolvedAmount}
                    orderId={orderId}
                    onSuccess={() => {
                      setOrderId(`tip-${Date.now()}`)
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-card/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What support funds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Assistant quality</p>
                  <p className="mt-1">Inference costs, routing improvements, and safer specialist handoffs.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Billing operations</p>
                  <p className="mt-1">Receipts, refunds, account management, and Base payment reliability.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
                  <p className="font-medium text-foreground">Product iteration</p>
                  <p className="mt-1">Contrast fixes, flow simplification, and better provider / caregiver UX.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Prefer to influence the roadmap?</CardTitle>
                <CardDescription>Use feedback for changes. Use support if you want to fund them directly.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button asChild variant="outline">
                  <Link href="/feedback">
                    Send feedback
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/chat?q=How%20can%20I%20use%20BaseHealth%20most%20effectively%3F">Ask assistant</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
