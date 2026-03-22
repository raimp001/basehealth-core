"use client"

/**
 * Patient Portal Dashboard - Claude.ai Design
 */

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { 
  ArrowRight,
  Shield,
  ClipboardList,
  Users,
  MessageCircle,
  CreditCard,
} from "lucide-react"
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
}

export default function PatientPortalPage() {
  const [mounted, setMounted] = useState(false)
  const { data: session, status: sessionStatus } = useSession()
  const { user: miniAppUser } = useMiniApp()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<BillingReceipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [storedProfileName, setStoredProfileName] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

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

      setReceiptsLoading(true)
      try {
        const response = await fetch(
          `/api/billing/receipts?walletAddress=${encodeURIComponent(walletAddress)}&limit=5`,
          { cache: "no-store" },
        )
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.success) {
          setReceipts([])
          return
        }
        setReceipts(Array.isArray(data.receipts) ? data.receipts : [])
      } catch {
        setReceipts([])
      } finally {
        setReceiptsLoading(false)
      }
    }

    loadReceipts()
  }, [walletAddress])

  useEffect(() => {
    if (sessionStatus !== "authenticated") return
    let cancelled = false

    const loadProfileName = async () => {
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.success) return
        const fullName = String(data?.profile?.fullName || "").trim()
        if (!cancelled && fullName) {
          setStoredProfileName(fullName)
        }
      } catch {
        // ignore
      }
    }

    loadProfileName()
    return () => {
      cancelled = true
    }
  }, [sessionStatus])

  const miniUser: any = miniAppUser as any
  const sessionName = (session?.user as any)?.name as string | undefined
  const displayName =
    (typeof miniUser?.displayName === "string" && miniUser.displayName.trim()) ||
    (typeof miniUser?.username === "string" && miniUser.username.trim()) ||
    storedProfileName ||
    (typeof sessionName === "string" && sessionName.trim()) ||
    "there"

  const avatarUrl =
    (typeof miniUser?.pfpUrl === "string" && miniUser.pfpUrl.trim()) ||
    (typeof miniUser?.avatarUrl === "string" && miniUser.avatarUrl.trim()) ||
    ((session?.user as any)?.image as string | undefined) ||
    ""

  const quickActions = [
    { title: 'Health Screening', description: 'Get personalized recommendations', icon: ClipboardList, href: '/screening' },
    { title: 'Find Providers', description: 'Search doctors & specialists', icon: Users, href: '/providers/search' },
    { title: 'Assistant', description: 'Chat with specialists', icon: MessageCircle, href: '/chat' },
    { title: 'Billing & Receipts', description: 'View payments and receipts', icon: CreditCard, href: '/billing' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <main className="py-8">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className={`mb-10 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <h1 className="text-3xl md:text-4xl font-normal tracking-tight mb-2">
              Welcome back, <span style={{ color: 'var(--text-secondary)' }}>{displayName.split(" ")[0]}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your health dashboard at a glance.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <section className={`${mounted ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
                <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="group p-5 rounded-xl border transition-all"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                          <action.icon className="h-5 w-5" style={{ color: 'hsl(var(--accent))' }} />
                        </div>
                        <ArrowRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <h3 className="font-medium mb-1">{action.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{action.description}</p>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Receipts Preview */}
              <section className={`${mounted ? 'animate-fade-in-up delay-300' : 'opacity-0'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">Receipts</h2>
                  <Link href="/billing" className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
                    View all
                  </Link>
                </div>

                <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  {!walletAddress ? (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Connect your Base wallet to see receipts.
                    </p>
                  ) : receiptsLoading ? (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Loading receipts…
                    </p>
                  ) : receipts.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No receipts yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.receiptId}
                          className="p-3 rounded-lg flex items-start justify-between gap-3"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {receipt.description || receipt.providerName || "Receipt"} • ${receipt.amount} {receipt.currency}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {new Date(receipt.issuedAt).toLocaleString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              • {receipt.paymentStatus.toLowerCase()}
                              {receipt.source === "transaction" ? " • standalone" : ""}
                            </p>
                          </div>

                          {receipt.paymentExplorerUrl ? (
                            <a
                              href={receipt.paymentExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs whitespace-nowrap"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              View
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Profile */}
              <section className={`${mounted ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
                          {displayName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {walletAddress
                          ? sessionStatus === "authenticated"
                            ? "BaseHealth account recognized"
                            : "Wallet connected"
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Security Status */}
              <section className={`${mounted ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5" style={{ color: '#6b9b6b' }} />
                    <span className="font-medium text-sm">HIPAA Secured</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Your health data is encrypted and protected.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
