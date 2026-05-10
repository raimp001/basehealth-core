/**
 * Solana Payment Verification API
 *
 * Verifies a Solana transaction was completed successfully.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isAdminEmail } from '@/lib/admin-access'
import {
  verifyExpectedTransfer,
  getExplorerUrl,
  isValidSolanaAddress,
} from '@/lib/solana-payment-service'

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
    const actorUserId = typeof token?.id === 'string' ? token.id : ''
    const actorEmail = typeof token?.email === 'string' ? token.email : ''

    if (!actorUserId && !isAdminEmail(actorEmail)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      signature,
      orderId,
      expectedRecipient,
      expectedAmount,
      currency = 'SOL',
      expectedSender,
    } = body

    if (!signature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
        { status: 400 }
      )
    }

    if (!expectedRecipient || expectedAmount == null || !currency) {
      return NextResponse.json(
        {
          error: 'expectedRecipient, expectedAmount, and currency are required',
        },
        { status: 400 }
      )
    }

    if (currency !== 'SOL' && currency !== 'USDC') {
      return NextResponse.json(
        {
          error: 'currency must be SOL or USDC',
        },
        { status: 400 }
      )
    }

    if (!isValidSolanaAddress(expectedRecipient)) {
      return NextResponse.json(
        {
          error: 'expectedRecipient is not a valid Solana address',
        },
        { status: 400 }
      )
    }

    if (expectedSender && !isValidSolanaAddress(expectedSender)) {
      return NextResponse.json(
        {
          error: 'expectedSender is not a valid Solana address',
        },
        { status: 400 }
      )
    }

    const normalizedAmount = Number.parseFloat(String(expectedAmount))
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return NextResponse.json(
        {
          error: 'expectedAmount must be a positive number',
        },
        { status: 400 }
      )
    }

    const verification = await verifyExpectedTransfer({
      signature,
      expectedRecipient,
      expectedAmount: normalizedAmount,
      currency,
      expectedSender,
    })

    if (!verification.confirmed) {
      return NextResponse.json({
        verified: false,
        status: 'failed',
        error: verification.error,
      }, { status: 400 })
    }

    return NextResponse.json({
      verified: true,
      status: 'completed',
      signature,
      slot: verification.slot,
      blockTime: verification.blockTime,
      explorerUrl: getExplorerUrl(signature),
      orderId,
    })

  } catch (error) {
    console.error('Error verifying Solana payment:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
