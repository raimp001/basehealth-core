"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  FileSearch,
  Wallet as WalletIcon,
} from "lucide-react"

const RECEIPTS_KEY = "basehealth:base-receipts"

type Receipt = {
  paymentId?: string
  txHash?: string
  sender?: string
  amountUsd?: number
  serviceName?: string
  serviceType?: string
  orderId?: string
  providerId?: string
  createdAt?: number
  network?: "base" | "base-sepolia"
}

function basescanUrl(receipt: Receipt) {
  const id = receipt.txHash || receipt.paymentId
  if (!id) return null
  const subdomain = receipt.network === "base-sepolia" ? "sepolia." : ""
  return `https://${subdomain}basescan.org/tx/${id}`
}

function shorten(value: string | undefined, chars = 6) {
  if (!value) return ""
  if (value.length <= chars * 2 + 2) return value
  return `${value.slice(0, chars)}…${value.slice(-chars)}`
}

export function WalletReceiptsClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = window.localStorage.getItem(RECEIPTS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setReceipts(parsed as Receipt[])
    } catch {
      /* ignore */
    }
  }, [])

  const total = useMemo(() => {
    return receipts.reduce((sum, r) => sum + (typeof r.amountUsd === "number" ? r.amountUsd : 0), 0)
  }, [receipts])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          On-chain audit
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Base receipts
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every BaseHealth payment is settled in USDC on Base, with a public on-chain transaction.
          Receipts below are stored locally on this device — open Basescan for full provenance.
        </p>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <WalletIcon className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Total settled</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            ${total.toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">USDC</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {receipts.length} on-chain receipt{receipts.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Network</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Base L2</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Settlements use USDC on Base; testnet receipts route to Base Sepolia.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileSearch className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">Audit</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">Public &amp; verifiable</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any txHash to inspect on Basescan — providers can verify settlement before delivering care.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent payments</h2>
          <Link
            href="/payment/base"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Start a Base Pay checkout
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {!mounted ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading receipts…</div>
        ) : receipts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <WalletIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              No on-chain receipts yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
              Pay a screening fee, copay, or telemedicine visit on Base to see your receipts here.
              Receipts are stored on this device — sign in to sync across devices (coming soon).
            </p>
            <Link
              href="/payment/base"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Pay $0.25 on Base
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {receipts.map((r, i) => {
              const url = basescanUrl(r)
              return (
                <li key={`${r.paymentId ?? r.txHash ?? i}`} className="px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {r.serviceName || r.serviceType || "BaseHealth payment"}
                        </p>
                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {r.network === "base-sepolia" ? "Sepolia" : "Base"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString()
                          : "Pending timestamp"}
                        {r.sender ? ` • from ${shorten(r.sender)}` : ""}
                        {r.providerId ? ` • provider ${r.providerId}` : ""}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                        tx {shorten(r.txHash || r.paymentId, 10)}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <p className="text-base font-semibold text-foreground">
                        ${typeof r.amountUsd === "number" ? r.amountUsd.toFixed(2) : "—"}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">USDC</span>
                      </p>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          View on Basescan
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Privacy-first: receipts contain payment metadata only. No PHI is stored on-chain or in this log.
      </p>
    </main>
  )
}
