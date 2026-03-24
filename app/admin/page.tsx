"use client"

/**
 * Admin Portal - Claude.ai Design
 */

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  CheckCircle, 
  Stethoscope,
  Heart,
  ArrowRight,
  RefreshCw,
  Database,
  Loader2,
  Calendar,
  Bot
} from "lucide-react"

interface Stats {
  providers: {
    total: number
    pending: number
    verified: number
  }
  caregivers: {
    total: number
    pending: number
    available: number
  }
  database: boolean
}

export default function AdminPortalPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const [providersRes, caregiversRes] = await Promise.all([
        fetch("/api/admin/providers"),
        fetch("/api/admin/caregivers")
      ])

      const providersData = await providersRes.json()
      const caregiversData = await caregiversRes.json()

      setStats({
        providers: providersData.stats || { total: 0, pending: 0, verified: 0 },
        caregivers: caregiversData.stats || { total: 0, pending: 0, available: 0 },
        database: providersData.success && caregiversData.success
      })
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch stats:", error)
      setStats({
        providers: { total: 0, pending: 0, verified: 0 },
        caregivers: { total: 0, pending: 0, available: 0 },
        database: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const totalPending = (stats?.providers.pending || 0) + (stats?.caregivers.pending || 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <main className="py-8 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-3xl font-normal tracking-tight mb-2">Admin Portal</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Review and manage applications</p>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={fetchStats} 
              disabled={isLoading}
              className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading && !stats ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-10">
                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Pending</span>
                  </div>
                  <p className="text-2xl font-normal">{totalPending}</p>
                </div>

                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Stethoscope className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Providers</span>
                  </div>
                  <p className="text-2xl font-normal">{stats?.providers.total || 0}</p>
                </div>

                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Caregivers</span>
                  </div>
                  <p className="text-2xl font-normal">{stats?.caregivers.total || 0}</p>
                </div>

                <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="w-5 h-5" style={{ color: '#6b9b6b' }} />
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verified</span>
                  </div>
                  <p className="text-2xl font-normal">
                    {(stats?.providers.verified || 0) + (stats?.caregivers.available || 0)}
                  </p>
                </div>
              </div>

              {/* Pending Alert */}
              {totalPending > 0 && (
                <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(212, 165, 116, 0.1)', border: '1px solid rgba(212, 165, 116, 0.2)' }}>
                  <p className="text-sm" style={{ color: 'hsl(var(--accent))' }}>
                    <span className="font-medium">{totalPending} application{totalPending > 1 ? 's' : ''}</span>
                    {' '}awaiting review
                  </p>
                </div>
              )}

              {/* Application Links */}
              <div className="space-y-3">
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Applications</p>
                
                <Link href="/admin/provider-applications">
                  <div className="rounded-xl p-5 transition-all cursor-pointer group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Stethoscope className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                        <div>
                          <p className="font-medium">Provider Applications</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {stats?.providers.pending || 0} pending
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </Link>

                <Link href="/admin/caregiver-applications">
                  <div className="rounded-xl p-5 transition-all cursor-pointer group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Heart className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                        <div>
                          <p className="font-medium">Caregiver Applications</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {stats?.caregivers.pending || 0} pending
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </Link>

                <Link href="/admin/bookings">
                  <div className="rounded-xl p-5 transition-all cursor-pointer group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Calendar className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                        <div>
                          <p className="font-medium">Bookings & Refunds</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            View bookings and process refunds
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </Link>
              </div>

              {/* Analytics & Growth */}
              <div className="space-y-3 mt-8">
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Analytics & Growth</p>
                
                <Link href="/admin/analytics">
                  <div className="rounded-xl p-5 transition-all cursor-pointer group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <RefreshCw className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                        <div>
                          <p className="font-medium">Onboarding Analytics</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Funnel conversion, drop-off rates, trends
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </Link>
              </div>

              <div className="space-y-3 mt-8">
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Automation</p>

                <Link href="/admin/research">
                  <div className="rounded-xl p-5 transition-all cursor-pointer group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Bot className="w-5 h-5" style={{ color: 'hsl(var(--accent))' }} />
                        <div>
                          <p className="font-medium">Auto-Research Worker</p>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Run local OpenClaw-guided research loops with saved history
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </Link>
              </div>

              {/* Footer */}
              <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Database</span>
                      {stats?.database ? (
                        <span style={{ color: '#6b9b6b' }}>●</span>
                      ) : (
                        <span style={{ color: 'hsl(var(--accent))' }}>●</span>
                      )}
                    </div>
                  </div>
                  {lastUpdated && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <div className="mt-4 flex gap-4">
                  <Link 
                    href="/onboarding?role=provider"
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Test Provider Signup →
                  </Link>
                  <Link 
                    href="/onboarding?role=caregiver"
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Test Caregiver Signup →
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
