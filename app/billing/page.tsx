"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CreditCard, ExternalLink, Receipt } from "lucide-react"
import { useMiniApp } from "@/components/providers/miniapp-provider"

type BillingReceipt = {
  receiptId: string
  bookingId: string
  source: "booking" | "transaction"
  amount: string
  currency: string
  bookingStatus: string
  paymentStatus: string
  paymentProvider: string
  issuedAt: string
  paidAt?: string
  providerName?: string
  description?: string
  paymentTxHash?: string
  paymentExplorerUrl?: string
  refundExplorerUrl?: string
  refundReason?: string
  refundAmount?: string
}

export default function BillingPage() {
  const { data: session } = useSession()
  const { user: miniAppUser } = useMiniApp()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<BillingReceipt[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionWallet = (session?.user as any)?.walletAddress
    if (typeof sessionWallet === "string" && /^0x[a-fA-F0-9]{40}$/.test(sessionWallet.trim())) {
      setWalletAddress((prev) => prev || sessionWallet.trim())
    }
  }, [session])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("basehealth_wallet_address") || ""
      if (saved && /^0x[a-fA-F0-9]{40}$/.test(saved.trim())) {
        setWalletAddress((prev) => prev || saved.trim())
      }
    } catch {
      // ignore
    }

    const handler = (event: any) => {
      const addr = (event?.detail?.address || "").trim()
      if (!addr) {
        setWalletAddress(null)
        return
      }
      if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        setWalletAddress(addr)
      }
    }

    window.addEventListener("basehealth:wallet", handler)
    return () => window.removeEventListener("basehealth:wallet", handler)
  }, [])

  useEffect(() => {
    const loadReceipts = async () => {
      if (!walletAddress) {
        setReceipts([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/billing/receipts?walletAddress=${encodeURIComponent(walletAddress)}&limit=20`,
          { cache: "no-store" },
        )
        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data?.success) {
          setReceipts([])
          setError(typeof data?.error === "string" ? data.error : "Failed to load receipts.")
          return
        }

        setReceipts(Array.isArray(data.receipts) ? data.receipts : [])
      } catch {
        setReceipts([])
        setError("Failed to load receipts.")
      } finally {
        setLoading(false)
      }
    }

    loadReceipts()
  }, [walletAddress])

  const miniUser: any = miniAppUser as any
  const sessionName = (session?.user as any)?.name as string | undefined
  const displayName =
    (typeof miniUser?.displayName === "string" && miniUser.displayName.trim()) ||
    (typeof miniUser?.username === "string" && miniUser.username.trim()) ||
    (typeof sessionName === "string" && sessionName.trim()) ||
    "Wallet"

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <main className="py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
            >
              <CreditCard className="h-4 w-4" style={{ color: "hsl(var(--accent))" }} />
              <span className="text-sm font-medium">Billing & Receipts</span>
            </div>

            <h1 className="mt-4 text-3xl md:text-4xl font-normal tracking-tight">Receipts</h1>
            <p className="mt-2 text-sm md:text-base" style={{ color: "var(--text-secondary)" }}>
              View your BaseHealth payment receipts for <span className="font-medium">{displayName}</span>.
            </p>
          </div>

          {!walletAddress ? (
            <div
              className="rounded-2xl border p-6"
              style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Connect your Base wallet to view receipts.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Tip: you can explore the app without signing in. Receipts require a connected wallet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div
                  className="rounded-2xl border p-4 text-sm"
                  style={{ backgroundColor: "rgba(220, 38, 38, 0.06)", borderColor: "rgba(220, 38, 38, 0.2)", color: "#b91c1c" }}
                >
                  {error}
                </div>
              ) : null}

              <div
                className="rounded-2xl border p-5"
                style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-subtle)" }}
              >
                {loading ? (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Loading receipts…
                  </p>
                ) : receipts.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      No receipts yet.
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Receipts appear after a payment is confirmed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div
                        key={receipt.receiptId}
                        className="flex items-start justify-between gap-3 p-4 rounded-xl border"
                        style={{ backgroundColor: "var(--bg-tertiary)", borderColor: "var(--border-subtle)" }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {receipt.description || receipt.providerName || "Receipt"} • ${receipt.amount} {receipt.currency}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            {new Date(receipt.issuedAt).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            • {receipt.paymentStatus.toLowerCase()}
                            {receipt.source === "transaction" ? " • standalone" : ""}
                          </p>
                          {receipt.refundReason ? (
                            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                              Refund: {receipt.refundReason}
                              {receipt.refundAmount ? ` (${receipt.refundAmount} ${receipt.currency})` : ""}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {receipt.paymentExplorerUrl ? (
                            <a
                              href={receipt.paymentExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Payment <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                              <Receipt className="h-3 w-3" /> {receipt.paymentProvider}
                            </span>
                          )}
                          {receipt.refundExplorerUrl ? (
                            <a
                              href={receipt.refundExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs whitespace-nowrap"
                              style={{ color: "var(--text-muted)" }}
                            >
                              Refund <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/chat?q=Help%20me%20find%20my%20receipts%2C%20track%20a%20refund%2C%20or%20understand%20a%20charge."
                  className="text-sm underline underline-offset-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  Ask the assistant about billing
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
