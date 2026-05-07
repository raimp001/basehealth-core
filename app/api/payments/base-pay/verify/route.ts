/**
 * Base Pay Verification API
 * 
 * Verifies Base Pay transactions on the server before fulfilling orders.
 * Prevents replay attacks and impersonation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import {
  verifyBasePayment,
  isPaymentProcessed,
  markPaymentProcessed,
  basePayConfig,
} from '@/lib/base-pay-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentId, orderId, expectedAmount, authenticatedUser } = body
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    const actorWallet = typeof token?.walletAddress === 'string' ? token.walletAddress.toLowerCase() : null

    if (!token?.id) {
      return NextResponse.json({
        verified: false,
        error: 'Authentication required',
      }, { status: 401 })
    }
    
    if (!paymentId) {
      return NextResponse.json({
        verified: false,
        error: 'Payment ID is required',
      }, { status: 400 })
    }
    
    // Check for replay attack
    if (isPaymentProcessed(paymentId)) {
      return NextResponse.json({
        verified: false,
        error: 'Payment already processed',
      }, { status: 400 })
    }
    
    // Verify the payment on-chain
    const verification = await verifyBasePayment(
      paymentId,
      expectedAmount,
      basePayConfig.recipientAddress
    )
    
    if (!verification.verified) {
      return NextResponse.json({
        verified: false,
        status: verification.status,
        error: verification.error,
      }, { status: 400 })
    }
    
    // Check for impersonation attack
    if (verification.sender) {
      const sender = verification.sender.toLowerCase()
      const claimedWallet = typeof authenticatedUser === 'string' ? authenticatedUser.toLowerCase() : null

      if (claimedWallet && sender !== claimedWallet) {
        return NextResponse.json({
          verified: false,
          error: 'Payment sender does not match claimed user wallet',
        }, { status: 400 })
      }

      if (actorWallet && sender !== actorWallet) {
        return NextResponse.json({
          verified: false,
          error: 'Payment sender does not match authenticated session wallet',
        }, { status: 403 })
      }
    }
    
    // Mark as processed to prevent replay
    markPaymentProcessed(
      paymentId,
      orderId,
      verification.sender || 'unknown',
      verification.amount || expectedAmount
    )
    
    return NextResponse.json({
      verified: true,
      status: 'completed',
      sender: verification.sender,
      amount: verification.amount,
      recipient: verification.recipient,
      orderId,
      message: 'Payment verified successfully',
    })
    
  } catch (error) {
    console.error('Base Pay verification error:', error)
    return NextResponse.json({
      verified: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, { status: 500 })
  }
}
