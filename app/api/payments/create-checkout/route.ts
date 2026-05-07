import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'
import { rateLimit, getClientIdentifier } from '@/lib/rate-limiter'
import { getServerSession } from 'next-auth'

// Initialize Stripe only if API key is provided
const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil'
}) : null

export async function POST(request: NextRequest) {
  try {
    // Return early if Stripe is not configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { 
      priceId, 
      mode = 'payment',
      successUrl,
      cancelUrl,
      metadata
    } = await request.json()

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancelled`,
      customer_email: session.user?.email || undefined,
      metadata: {
        userId: session.user?.id || '',
        ...metadata
      }
    })

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

  } catch (error) {
    logger.error('Stripe checkout error', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

// Create payment intent for custom payment flow
export async function PUT(request: NextRequest) {
  try {
    // Return early if Stripe is not configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing not configured' },
        { status: 503 }
      )
    }

    const session = await getServerSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { amount, currency = 'usd', metadata } = await request.json()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true
      },
      metadata: {
        userId: session.user?.id || '',
        ...metadata
      }
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })

  } catch (error) {
    logger.error('Payment intent error', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
