"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Search,
  Pill,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Building2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { BasePayCheckout } from "@/components/checkout/base-pay-checkout"
import {
  MEDICATION_CATALOG,
  searchCatalog,
  type CatalogDrug,
} from "@/lib/medication-catalog"
import {
  loadCart,
  saveCart,
  clearCart,
  cartSubtotal,
  type CartItem,
} from "@/lib/health-store"

type Step = "search" | "review" | "details" | "pay" | "success"

const SERVICE_FEE_USD = 1.0

const PHARMACIES = [
  { id: "pharm-walgreens", name: "Walgreens", desc: "Most US locations · 24h options", network: true },
  { id: "pharm-cvs", name: "CVS Pharmacy", desc: "Nationwide retail", network: true },
  { id: "pharm-costplus", name: "Mark Cuban Cost Plus Drugs", desc: "Mail-order, transparent pricing", network: true },
  { id: "pharm-amazon", name: "Amazon Pharmacy", desc: "Mail-order delivery", network: true },
]

export function MedicationOrderFlow() {
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>("search")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CatalogDrug["category"] | "all">("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [pharmacy, setPharmacy] = useState(PHARMACIES[0].id)
  const [shipping, setShipping] = useState({ name: "", address: "", city: "", state: "", zip: "" })
  const [orderId] = useState(`order-${Date.now()}`)

  useEffect(() => {
    setCart(loadCart())
    const refill = searchParams?.get("refill")
    if (refill) {
      setQuery(refill)
    }
  }, [searchParams])

  const results = useMemo(
    () => searchCatalog(query, category === "all" ? undefined : category),
    [query, category],
  )

  const subtotal = useMemo(() => cartSubtotal(cart), [cart])
  const total = subtotal + (cart.length > 0 ? SERVICE_FEE_USD : 0)

  function addItem(drug: CatalogDrug) {
    const next = [...cart]
    const existing = next.find((c) => c.drugId === drug.id)
    if (existing) {
      existing.quantity += 1
    } else {
      next.push({
        drugId: drug.id,
        name: drug.name,
        strength: drug.strength,
        priceUsd: drug.priceUsd,
        quantity: 1,
      })
    }
    setCart(next)
    saveCart(next)
  }

  function changeQty(drugId: string, delta: number) {
    const next = cart
      .map((c) => (c.drugId === drugId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c))
      .filter((c) => c.quantity > 0)
    setCart(next)
    saveCart(next)
  }

  function removeItem(drugId: string) {
    const next = cart.filter((c) => c.drugId !== drugId)
    setCart(next)
    saveCart(next)
  }

  function handleSuccess() {
    clearCart()
    setCart([])
    setStep("success")
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === "search" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search medications (e.g. Lisinopril, Ozempic)"
                  className="pl-9 bg-card/50 border-border/60 focus-visible:ring-cyan-500/60"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CatalogDrug["category"] | "all")}
                className="h-10 rounded-md border border-border/60 bg-card/50 text-sm px-3 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
              >
                <option value="all">All categories</option>
                <option value="cardiovascular">Cardiovascular</option>
                <option value="metabolic">Metabolic</option>
                <option value="endocrine">Endocrine</option>
                <option value="mental-health">Mental health</option>
                <option value="infectious">Infectious disease</option>
                <option value="respiratory">Respiratory</option>
                <option value="gi">GI</option>
                <option value="pain">Pain</option>
              </select>
            </div>

            {results.length === 0 ? (
              <Card className="border-dashed border-border/60 bg-card/30">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No medications match that search. Try a generic name like
                  <span className="text-foreground font-medium"> &ldquo;metformin&rdquo;</span>.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {results.map((drug) => (
                  <Card
                    key={drug.id}
                    className="border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-semibold text-foreground truncate">
                              {drug.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className="bg-card/60 border border-border/60 text-foreground text-[11px]"
                            >
                              {drug.strength}
                            </Badge>
                          </div>
                          {drug.generic && drug.generic !== drug.name.toLowerCase() && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Generic: {drug.generic}
                            </p>
                          )}
                          {drug.description && (
                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                              {drug.description}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <span className="font-display text-base font-semibold text-foreground">
                              ${drug.priceUsd.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">/ 30-day supply</span>
                            {drug.rxRequired && (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40 text-[10px]">
                                Rx required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addItem(drug)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <CartSidebar
            cart={cart}
            onChangeQty={changeQty}
            onRemove={removeItem}
            subtotal={subtotal}
            total={total}
            onContinue={() => setStep("review")}
          />
        </div>
      )}

      {step === "review" && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Review your order
              </h2>
              <p className="text-sm text-muted-foreground">
                Confirm items and quantities before continuing.
              </p>
            </div>
            <CartReview cart={cart} onChangeQty={changeQty} onRemove={removeItem} />
            <PriceSummary subtotal={subtotal} total={total} cart={cart} />
            <StepNav
              backLabel="Back to search"
              onBack={() => setStep("search")}
              continueLabel="Continue"
              onContinue={() => setStep("details")}
              continueDisabled={cart.length === 0}
            />
          </CardContent>
        </Card>
      )}

      {step === "details" && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Pharmacy &amp; delivery
              </h2>
              <p className="text-sm text-muted-foreground">
                Choose where to send the prescription and where to deliver it.
              </p>
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pharmacy
              </Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PHARMACIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPharmacy(p.id)}
                    className={`text-left rounded-lg border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 ${
                      pharmacy === p.id
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/60 bg-background/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.network && (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 text-[10px] ml-auto">
                          In-network
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={shipping.name}
                  onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Street address">
                <Input
                  value={shipping.address}
                  onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </Field>
              <Field label="City">
                <Input
                  value={shipping.city}
                  onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                  placeholder="Portland"
                />
              </Field>
              <Field label="State">
                <Input
                  value={shipping.state}
                  onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                  placeholder="OR"
                />
              </Field>
              <Field label="ZIP code">
                <Input
                  value={shipping.zip}
                  onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                  placeholder="97201"
                />
              </Field>
            </div>

            <PriceSummary subtotal={subtotal} total={total} cart={cart} />

            <StepNav
              backLabel="Back"
              onBack={() => setStep("review")}
              continueLabel="Continue to payment"
              onContinue={() => setStep("pay")}
              continueDisabled={!shipping.name || !shipping.address || !shipping.zip}
            />
          </CardContent>
        </Card>
      )}

      {step === "pay" && (
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                Pay with Base
              </h2>
              <p className="text-sm text-muted-foreground">
                One-tap USDC checkout. Settles on Base in seconds.
              </p>
            </div>

            <PriceSummary subtotal={subtotal} total={total} cart={cart} />

            <BasePayCheckout
              amount={total}
              serviceName="Medication order"
              serviceType="medication-order"
              serviceDescription={`${cart.length} medication${cart.length === 1 ? "" : "s"} to ${
                PHARMACIES.find((p) => p.id === pharmacy)?.name
              }`}
              orderId={orderId}
              providerId="basehealth-pharmacy"
              onSuccess={handleSuccess}
            />

            <Alert
              icon={<AlertCircle className="h-4 w-4" />}
              tone="info"
            >
              For prescription items, BaseHealth will route the e-prescription to the chosen pharmacy
              after payment. You will receive a confirmation when the pharmacy has it ready.
            </Alert>

            <StepNav backLabel="Back" onBack={() => setStep("details")} />
          </CardContent>
        </Card>
      )}

      {step === "success" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Order confirmed
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your medications are being routed to{" "}
              <span className="text-foreground font-medium">
                {PHARMACIES.find((p) => p.id === pharmacy)?.name}
              </span>
              . You can track status in your medication list.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/medications">View medications</Link>
              </Button>
              <Button asChild variant="outline" className="border-border/60">
                <Link href="/medications/order">Order more</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "search", label: "Search" },
    { key: "review", label: "Review" },
    { key: "details", label: "Pharmacy" },
    { key: "pay", label: "Pay" },
    { key: "success", label: "Done" },
  ]
  const idx = steps.findIndex((s) => s.key === step)
  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const active = i === idx
        const complete = i < idx
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-glow-cyan"
                  : complete
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/50"
                    : "bg-card/40 text-muted-foreground border-border/60"
              }`}
            >
              {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={`hidden sm:inline ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </li>
        )
      })}
    </ol>
  )
}

function CartSidebar({
  cart,
  onChangeQty,
  onRemove,
  subtotal,
  total,
  onContinue,
}: {
  cart: CartItem[]
  onChangeQty: (drugId: string, delta: number) => void
  onRemove: (drugId: string) => void
  subtotal: number
  total: number
  onContinue: () => void
}) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-sm h-fit sticky top-24">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-foreground">
            Your cart
          </h3>
          <Badge variant="secondary" className="bg-card/60 border border-border/60 text-foreground">
            {cart.reduce((s, i) => s + i.quantity, 0)} items
          </Badge>
        </div>
        {cart.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Pill className="h-6 w-6 mx-auto text-muted-foreground/60" />
            <p className="mt-2">Add medications to get started.</p>
          </div>
        ) : (
          <CartReview cart={cart} onChangeQty={onChangeQty} onRemove={onRemove} compact />
        )}
        {cart.length > 0 && (
          <>
            <div className="border-t border-border/60 pt-3 text-sm space-y-1">
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} muted />
              <Row label="Service fee" value={`$${SERVICE_FEE_USD.toFixed(2)}`} muted />
              <Row label="Total" value={`$${total.toFixed(2)}`} bold />
            </div>
            <Button
              onClick={onContinue}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
            >
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Secured by Base Pay (USDC)
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CartReview({
  cart,
  onChangeQty,
  onRemove,
  compact = false,
}: {
  cart: CartItem[]
  onChangeQty: (drugId: string, delta: number) => void
  onRemove: (drugId: string) => void
  compact?: boolean
}) {
  if (cart.length === 0)
    return (
      <p className="text-sm text-muted-foreground">Your cart is empty.</p>
    )
  return (
    <ul className="divide-y divide-border/60">
      {cart.map((item) => (
        <li key={item.drugId} className={`flex items-center gap-3 ${compact ? "py-2" : "py-3"}`}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.strength}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChangeQty(item.drugId, -1)}
              aria-label={`Decrease ${item.name}`}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold text-foreground w-5 text-center">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChangeQty(item.drugId, 1)}
              aria-label={`Increase ${item.name}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="text-sm font-medium text-foreground tabular-nums">
            ${(item.priceUsd * item.quantity).toFixed(2)}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.drugId)}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}

function PriceSummary({
  subtotal,
  total,
  cart,
}: {
  subtotal: number
  total: number
  cart: CartItem[]
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm space-y-1">
      <Row
        label="Items"
        value={`${cart.reduce((s, i) => s + i.quantity, 0)} (${cart.length} unique)`}
        muted
      />
      <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} muted />
      <Row label="Service fee" value={`$${SERVICE_FEE_USD.toFixed(2)}`} muted />
      <div className="border-t border-border/60 my-2" />
      <Row label="Total (USDC on Base)" value={`$${total.toFixed(2)}`} bold />
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span
        className={`tabular-nums ${
          bold ? "font-display text-base font-semibold text-foreground" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function StepNav({
  backLabel,
  onBack,
  continueLabel,
  onContinue,
  continueDisabled,
}: {
  backLabel: string
  onBack: () => void
  continueLabel?: string
  onContinue?: () => void
  continueDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {backLabel}
      </Button>
      {continueLabel && onContinue && (
        <Button
          onClick={onContinue}
          disabled={continueDisabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-cyan"
        >
          {continueLabel}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  )
}

function Alert({
  icon,
  tone,
  children,
}: {
  icon: React.ReactNode
  tone: "info" | "warn"
  children: React.ReactNode
}) {
  const styles =
    tone === "warn"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-cyan-500/30 bg-cyan-500/5 text-foreground"
  return (
    <div className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${styles}`}>
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <p className="leading-relaxed">{children}</p>
    </div>
  )
}
