import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// Initialize Stripe only if API key is provided
const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil'
}) : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    // Return early if Stripe is not configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing not configured' },
        { status: 503 }
      )
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error('Webhook signature verification failed', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        logger.info('Checkout completed', { sessionId: session.id })
        
        // Update user subscription status in database
        const userId = session.metadata?.userId
        if (userId) {
          // TODO: Update user subscription in database
          console.log('Updating subscription for user:', userId)
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id })
        
        // Process successful payment
        const userId = paymentIntent.metadata?.userId
        if (userId) {
          // TODO: Update payment record in database
          logger.info('Recording payment for user', { userId })
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        logger.warn('Payment failed', { paymentIntentId: paymentIntent.id })
        
        // Handle failed payment
        const userId = paymentIntent.metadata?.userId
        if (userId) {
          // TODO: Notify user of failed payment
          logger.warn('Payment failed for user', { userId })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        logger.info('Subscription updated', { subscriptionId: subscription.id })
        
        // Update subscription in database
        const userId = subscription.metadata?.userId
        if (userId) {
          // TODO: Update subscription status
          console.log('Updating subscription for user:', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        logger.info('Subscription cancelled', { subscriptionId: subscription.id })
        
        // Handle subscription cancellation
        const userId = subscription.metadata?.userId
        if (userId) {
          // TODO: Update user to free tier
          logger.info('Subscription cancelled for user', { userId })
        }
        break
      }

      default:
        logger.warn(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    logger.error('Webhook error', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
