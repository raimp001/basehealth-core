import Stripe from "stripe"

// Check if Stripe is properly configured
const isStripeConfigured = () => {
  const key = process.env.STRIPE_SECRET_KEY
  return key && key.startsWith("sk_") && !key.includes("placeholder")
}

// Initialize Stripe only if configured
export const stripe = isStripeConfigured()
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    })
  : null

/**
 * Create a payment intent using Stripe.
 */
export async function createPaymentIntent(amount: number, currency: string = "usd") {
  if (!stripe) {
    throw new Error("Stripe is not configured.")
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    })
    return paymentIntent
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

/**
 * Create an appointment payment intent using Stripe.
 */
export async function createAppointmentPayment(amount: number, appointmentId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured.")
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        appointmentId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })
    return paymentIntent
  } catch (error) {
    console.error('Error creating appointment payment:', error)
    throw error
  }
}

/**
 * Verify a payment intent status
 */
export async function verifyPaymentIntent(paymentIntentId: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured.")
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return paymentIntent
  } catch (error) {
    console.error('Error verifying payment intent:', error)
    throw error
  }
}

/**
 * Get Stripe configuration status
 */
export function getStripeStatus() {
  return {
    configured: isStripeConfigured(),
    message: isStripeConfigured()
      ? "Stripe is configured and ready for payments."
      : "Stripe is not configured.",
  }
}
