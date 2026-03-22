"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  MapPin,
  User,
  Loader2
} from "lucide-react"

interface Booking {
  id: string
  status: string
  paymentStatus: string
  amount: number | null
  currency: string
  careType: string
  startDate: string
  endDate: string | null
  createdAt: string
  paymentProvider: string | null
  paymentMetadata?: {
    payment?: {
      txHash?: string
      explorerUrl?: string
    }
    refund?: {
      txHash?: string
      explorerUrl?: string
      amount?: number | string
      reason?: string
    }
  } | null
  user?: { id: string; name: string | null; email: string | null }
  caregiver?: { id: string; firstName: string; lastName: string }
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundTxHash, setRefundTxHash] = useState('')
  const [refundError, setRefundError] = useState<string | null>(null)
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [filter])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      
      const response = await fetch(`/api/admin/bookings?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.bookings)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!selectedBooking || !refundReason) return

    const requiresOnchainRefundTx = ['BASE_USDC', 'COINBASE_ONCHAIN', 'BASE_ETH'].includes(selectedBooking.paymentProvider || '')
    setRefundError(null)
    setRefundSuccess(null)

    if (requiresOnchainRefundTx && !/^0x[a-fA-F0-9]{64}$/.test(refundTxHash.trim())) {
      setRefundError('Paste the onchain refund transaction hash after sending the refund from the treasury wallet.')
      return
    }
    
    setRefundingId(selectedBooking.id)
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: refundReason,
          refundAmount: refundAmount ? Number.parseFloat(refundAmount) : selectedBooking.amount,
          txHash: refundTxHash.trim() || undefined,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update local state
        setBookings(bookings.map(b => 
          b.id === selectedBooking.id 
            ? {
                ...b,
                status: 'REFUNDED',
                paymentStatus: 'REFUNDED',
                paymentMetadata: {
                  ...(b.paymentMetadata || {}),
                  refund: {
                    txHash: data.booking?.refundTxHash,
                    explorerUrl: data.booking?.refundExplorerUrl,
                    amount: data.booking?.refundAmount,
                    reason: data.booking?.refundReason,
                  },
                },
              }
            : b
        ))
        setRefundSuccess(data.booking?.refundExplorerUrl ? 'Refund recorded. Explorer link added to the booking.' : 'Refund recorded successfully.')
        setShowRefundModal(false)
        setRefundReason('')
        setRefundAmount('')
        setRefundTxHash('')
        setSelectedBooking(null)
      } else {
        setRefundError(data.error || 'Refund failed')
      }
    } catch (err) {
      setRefundError('Failed to process refund')
    } finally {
      setRefundingId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      case 'REFUNDED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'REFUNDED': return 'bg-red-100 text-red-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Bookings Management</h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                View and manage all bookings, including refunds
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-medium)' }}
          >
            <option value="all">All Bookings</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button
            onClick={fetchBookings}
            className="p-2 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: 'var(--border-medium)' }}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {refundSuccess && (
          <div className="p-4 mb-6 rounded-lg bg-green-50 text-green-700 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {refundSuccess}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--text-secondary)' }} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bookings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="p-6 rounded-xl border"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                        Payment: {booking.paymentStatus}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-medium mb-2">
                      {booking.careType || 'Service Booking'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {booking.user?.name || booking.user?.email || 'Unknown User'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(booking.startDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {booking.amount ? `$${booking.amount} ${booking.currency}` : 'No payment info'}
                      </div>
                      {booking.caregiver ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Caregiver: {`${booking.caregiver.firstName} ${booking.caregiver.lastName}`.trim()}
                        </div>
                      ) : null}
                      {booking.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {booking.city}, {booking.state}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Refund button - only show for paid bookings that aren't refunded */}
                  {booking.paymentStatus === 'PAID' && booking.status !== 'REFUNDED' && (
                    <button
                      onClick={() => {
                        setSelectedBooking(booking)
                        setRefundReason('')
                        setRefundAmount(booking.amount ? String(booking.amount) : '')
                        setRefundTxHash('')
                        setRefundError(null)
                        setShowRefundModal(true)
                      }}
                      className="px-4 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: '#dc6464' }}
                    >
                      Issue Refund
                    </button>
                  )}

                  {booking.status === 'REFUNDED' && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Refunded
                      </div>
                      {booking.paymentMetadata?.refund?.explorerUrl && (
                        <a
                          href={booking.paymentMetadata.refund.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View refund on BaseScan
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                  Booking ID: {booking.id} • Created: {new Date(booking.createdAt).toLocaleString()}
                  {booking.paymentProvider && ` • Payment: ${booking.paymentProvider}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Refund Modal */}
      {showRefundModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="w-full max-w-md rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <h3 className="text-xl font-semibold mb-4">Issue Refund</h3>
            
            <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Booking: {selectedBooking.careType || 'Service'}
              </p>
              <p className="text-lg font-medium">
                ${selectedBooking.amount} {selectedBooking.currency}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Customer: {selectedBooking.user?.email}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Payment provider: {selectedBooking.paymentProvider || 'Unknown'}
              </p>
            </div>

            {['BASE_USDC', 'COINBASE_ONCHAIN', 'BASE_ETH'].includes(selectedBooking.paymentProvider || '') && (
              <div
                className="mb-4 rounded-lg border p-4 text-sm"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <p className="font-medium mb-1">Base refund workflow</p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Send the refund from the treasury wallet first, then paste the refund transaction hash below so
                  receipts, refund status, and audit history stay consistent.
                </p>
              </div>
            )}

            <label className="block mb-4">
              <span className="text-sm font-medium mb-2 block">Refund amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-medium)' }}
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-medium mb-2 block">Reason for refund *</span>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g., Service not available in customer's area"
                className="w-full p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-medium)' }}
                rows={3}
              />
            </label>

            {['BASE_USDC', 'COINBASE_ONCHAIN', 'BASE_ETH'].includes(selectedBooking.paymentProvider || '') && (
              <label className="block mb-4">
                <span className="text-sm font-medium mb-2 block">Refund transaction hash *</span>
                <input
                  type="text"
                  value={refundTxHash}
                  onChange={(e) => setRefundTxHash(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 rounded-lg border font-mono text-sm"
                  style={{ borderColor: 'var(--border-medium)' }}
                />
              </label>
            )}

            {refundError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {refundError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false)
                  setSelectedBooking(null)
                  setRefundReason('')
                  setRefundAmount('')
                  setRefundTxHash('')
                  setRefundError(null)
                }}
                className="flex-1 py-3 rounded-lg border font-medium"
                style={{ borderColor: 'var(--border-medium)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundReason || refundingId === selectedBooking.id}
                className="flex-1 py-3 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#dc6464' }}
              >
                {refundingId === selectedBooking.id ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Confirm Refund'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
