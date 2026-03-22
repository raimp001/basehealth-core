/**
 * Payment Verification API
 * 
 * Server-side verification of Base Pay payments.
 * Call before fulfilling orders to prevent replay attacks.
 * 
 * POST /api/payments/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  verifyBasePayment, 
  isPaymentProcessed, 
  markPaymentProcessed,
  basePayConfig,
} from '@/lib/base-pay-service'
import { recordProviderEarning } from '@/lib/usdc-settlement-service'
import { 
  sendPatientReceipt, 
  notifyProviderOfBooking, 
  notifyAdminOfBooking 
} from '@/lib/booking-notifications'
import { prisma } from '@/lib/prisma'
import { ACTIVE_CHAIN } from '@/lib/network-config'
import { createBillingReceipt } from '@/lib/base-billing'

interface VerifyRequest {
  paymentId: string
  orderId: string
  expectedAmount: string
  expectedRecipient?: string
  // Optional booking details for notifications
  patientName?: string
  patientEmail?: string
  providerName?: string
  providerEmail?: string
  serviceType?: string
  serviceDescription?: string
  appointmentDate?: string
  providerId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json()
    
    const { 
      paymentId, 
      orderId, 
      expectedAmount, 
      expectedRecipient = basePayConfig.recipientAddress 
    } = body
    
    // Validate required fields
    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required',
      }, { status: 400 })
    }
    
    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required',
      }, { status: 400 })
    }
    
    if (!expectedAmount) {
      return NextResponse.json({
        success: false,
        error: 'Expected amount is required',
      }, { status: 400 })
    }
    
    // Check for replay attack
    if (isPaymentProcessed(paymentId)) {
      return NextResponse.json({
        success: false,
        error: 'Payment has already been processed',
        code: 'PAYMENT_ALREADY_PROCESSED',
      }, { status: 409 })
    }
    
    // Verify payment with Base Pay SDK
    const verification = await verifyBasePayment(
      paymentId,
      expectedAmount,
      expectedRecipient
    )
    
    if (!verification.verified) {
      return NextResponse.json({
        success: false,
        error: verification.error || 'Payment verification failed',
        status: verification.status,
      }, { status: 400 })
    }

    const normalizedSender =
      typeof verification.sender === "string" ? verification.sender.toLowerCase() : verification.sender
    const normalizedRecipient =
      typeof verification.recipient === "string" ? verification.recipient.toLowerCase() : verification.recipient
    
    // Mark payment as processed to prevent replay
    markPaymentProcessed(
      paymentId,
      orderId,
      verification.sender || '',
      verification.amount || expectedAmount
    )

    const parsedExpectedAmount = Number.parseFloat(expectedAmount)
    const normalizedAmount = Number.isFinite(parsedExpectedAmount) ? parsedExpectedAmount : 0

    // Record provider earning (credit to their pending balance)
    const providerId = body.providerId
    if (providerId) {
      const amountUsd = normalizedAmount
      await recordProviderEarning(providerId, amountUsd, paymentId)
    }

    let receipt: ReturnType<typeof createBillingReceipt> | null = null
    let bookingFromDb: any = null

    // Persist payment state on booking and create transaction record
    if (orderId) {
      const booking = await prisma.booking.findUnique({
        where: { id: orderId },
        include: {
          caregiver: { select: { firstName: true, lastName: true, email: true } },
          user: { select: { name: true, email: true } },
        },
      })

      if (booking) {
        const existingMetadata =
          booking.paymentMetadata && typeof booking.paymentMetadata === 'object'
            ? (booking.paymentMetadata as Record<string, any>)
            : {}

        const updatedBooking = await prisma.booking.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            status: booking.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED',
            paidAt: new Date(),
            confirmedAt: booking.confirmedAt || new Date(),
            paymentProvider: booking.paymentProvider || 'BASE_USDC',
            paymentProviderId: paymentId,
            paymentMetadata: {
              ...existingMetadata,
              network: ACTIVE_CHAIN.name,
              payment: {
                ...(existingMetadata.payment || {}),
                txHash: paymentId,
                network: ACTIVE_CHAIN.name,
                verifiedAt: new Date().toISOString(),
                sender: normalizedSender,
                recipient: normalizedRecipient,
                amount: verification.amount || expectedAmount,
                serviceType: body.serviceType || undefined,
                serviceDescription: body.serviceDescription || body.serviceType || undefined,
              },
            },
          },
          include: {
            caregiver: { select: { firstName: true, lastName: true, email: true } },
            user: { select: { name: true, email: true } },
          },
        })

        bookingFromDb = updatedBooking
        receipt = createBillingReceipt(updatedBooking)

        await prisma.transaction.create({
          data: {
            bookingId: updatedBooking.id,
            transactionHash: paymentId,
            provider: updatedBooking.paymentProvider || 'BASE_USDC',
            providerId: paymentId,
            amount: normalizedAmount,
            currency: updatedBooking.currency || 'USDC',
            status: 'PAID',
            completedAt: new Date(),
            metadata: {
              orderId,
              sender: normalizedSender,
              recipient: normalizedRecipient,
              network: ACTIVE_CHAIN.name,
              serviceType: body.serviceType,
              serviceDescription: body.serviceDescription || body.serviceType,
              patientName: updatedBooking.user?.name || body.patientName,
              patientEmail: updatedBooking.user?.email || body.patientEmail,
              providerName:
                `${updatedBooking.caregiver?.firstName || ''} ${updatedBooking.caregiver?.lastName || ''}`.trim() ||
                body.providerName,
              bookingStatus: updatedBooking.status,
            },
          },
        }).catch(() => null)
      }
    }

    // Standalone payments (tips, platform fees, non-booking purchases)
    if (!bookingFromDb) {
      const now = new Date()

      // Best-effort transaction record for auditability
      await prisma.transaction
        .create({
          data: {
            bookingId: null,
            transactionHash: paymentId,
            provider: 'BASE_USDC',
            providerId: paymentId,
            amount: normalizedAmount,
            currency: 'USDC',
            status: 'PAID',
            completedAt: now,
            metadata: {
              orderId,
              sender: normalizedSender,
              recipient: normalizedRecipient,
              network: ACTIVE_CHAIN.name,
              serviceType: body.serviceType,
              serviceDescription: body.serviceDescription || body.serviceType,
              serviceLabel: body.serviceDescription || body.serviceType || "BaseHealth payment",
              patientName: body.patientName,
              patientEmail: body.patientEmail,
              providerName: body.providerName,
              standalone: true,
            },
          },
        })
        .catch(() => null)

      // Lightweight receipt shape (not tied to a booking)
      receipt = createBillingReceipt({
        id: orderId,
        amount: normalizedAmount,
        currency: 'USDC',
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        paymentProvider: 'BASE_USDC',
        paymentProviderId: paymentId,
        paymentMetadata: {
          network: ACTIVE_CHAIN.name,
          payment: {
            txHash: paymentId,
            network: ACTIVE_CHAIN.name,
            verifiedAt: now.toISOString(),
            sender: normalizedSender,
            recipient: normalizedRecipient,
            amount: verification.amount || expectedAmount,
            serviceType: body.serviceType,
            serviceDescription: body.serviceDescription || body.serviceType,
          },
        },
        createdAt: now,
        paidAt: now,
        user: {
          name: body.patientName || undefined,
          email: body.patientEmail || undefined,
        },
        caregiver: body.providerName ? { name: body.providerName } : null,
      })
    }
    
    // Send notifications only for real bookings (tips/support should not trigger booking emails).
    if (bookingFromDb) {
      // Send notifications (don't block on these)
      const bookingDetails = {
        bookingId: orderId,
        patientName: bookingFromDb?.user?.name || body.patientName || 'Patient',
        patientEmail: bookingFromDb?.user?.email || body.patientEmail || '',
        providerName:
          `${bookingFromDb?.caregiver?.firstName || ''} ${bookingFromDb?.caregiver?.lastName || ''}`.trim()
          || body.providerName
          || 'Provider',
        providerEmail: bookingFromDb?.caregiver?.email || body.providerEmail,
        serviceType: body.serviceType || 'Healthcare Service',
        appointmentDate: body.appointmentDate || new Date().toLocaleDateString(),
        amount: normalizedAmount,
        currency: bookingFromDb?.currency || 'USDC',
        txHash: paymentId,
      }
      
      // Send receipt to patient
      if (body.patientEmail) {
        sendPatientReceipt(bookingDetails).catch(console.error)
      }
      
      // Notify provider of new booking
      notifyProviderOfBooking(bookingDetails).catch(console.error)
      
      // Notify admin
      notifyAdminOfBooking(bookingDetails).catch(console.error)
    }
    
    return NextResponse.json({
      success: true,
      verified: true,
      receipt,
      payment: {
        id: paymentId,
        orderId,
        sender: normalizedSender,
        recipient: normalizedRecipient,
        amount: verification.amount,
        status: verification.status,
      },
    })
    
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, { status: 500 })
  }
}

/**
 * GET - Check if a payment has been processed
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('paymentId')
  
  if (!paymentId) {
    return NextResponse.json({
      success: false,
      error: 'Payment ID is required',
    }, { status: 400 })
  }
  
  const processed = isPaymentProcessed(paymentId)
  
  return NextResponse.json({
    success: true,
    paymentId,
    processed,
  })
}
