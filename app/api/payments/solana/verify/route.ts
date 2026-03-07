/**
 * Solana Payment Verification API
 *
 * Verifies a Solana transaction was completed successfully.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyExpectedTransfer, getExplorerUrl } from '@/lib/solana-payment-service'

export async function POST(request: NextRequest) {
  try {
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

    if (!expectedRecipient || !expectedAmount || !currency) {
      return NextResponse.json(
        {
          error: 'expectedRecipient, expectedAmount, and currency are required',
        },
        { status: 400 }
      )
    }

    const verification = await verifyExpectedTransfer({
      signature,
      expectedRecipient,
      expectedAmount: Number(expectedAmount),
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
