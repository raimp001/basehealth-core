'use client'

/**
 * Base Pay Checkout Component
 * 
 * One-tap USDC payment with Face ID / fingerprint confirmation.
 * Uses Base Pay SDK for the smoothest crypto checkout experience.
 * 
 * User flow:
 * 1. See amount and "Pay with Base" button
 * 2. Tap button → Wallet popup appears
 * 3. Confirm with Face ID / fingerprint
 * 4. Payment settles in ~2 seconds
 */

import { useState, useCallback } from 'react'
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Loader2, 
  Zap,
  Shield,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { 
  createPaymentConfig, 
  basePayConfig,
  type BasePayRequest 
} from '@/lib/base-pay-service'

interface BasePayCheckoutProps {
  amount: number
  serviceName: string
  /**
   * Stable identifier stored in payment metadata (useful for access passes, subscriptions, etc).
   * Defaults to serviceName for backwards compatibility.
   */
  serviceType?: string
  serviceDescription?: string
  providerName?: string
  providerWallet?: string
  orderId: string
  providerId: string
  onSuccess?: (result: PaymentResult) => void
  onError?: (error: string) => void
  collectEmail?: boolean
}

interface PaymentResult {
  paymentId: string
  txHash?: string
  sender?: string
  email?: string
}

type CheckoutStep = 'ready' | 'processing' | 'success' | 'error'

export function BasePayCheckout({
  amount,
  serviceName,
  serviceType,
  serviceDescription,
  providerName,
  providerWallet,
  orderId,
  providerId,
  onSuccess,
  onError,
  collectEmail = true,
}: BasePayCheckoutProps) {
  const [step, setStep] = useState<CheckoutStep>('ready')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaymentResult | null>(null)
  
  const handlePayment = useCallback(async () => {
    setStep('processing')
    setError(null)
    
    try {
      // Dynamic import of Base Pay SDK
      const { pay } = await import('@base-org/account')
      
      // Create payment request
      const paymentConfig = createPaymentConfig({
        amount: amount.toFixed(2),
        orderId,
        providerId,
        providerWallet: providerWallet || basePayConfig.recipientAddress,
        serviceType: serviceType || serviceName,
        serviceDescription: serviceDescription || serviceName,
        collectEmail,
      })
      
      // Trigger Base Pay popup
      const payment = await pay(paymentConfig)

      // Verify + record the payment server-side (receipts/refunds depend on this metadata).
      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          orderId,
          expectedAmount: amount.toFixed(2),
          providerId,
          serviceType: serviceType || serviceName,
          serviceDescription: serviceDescription || serviceName,
          patientEmail: payment.payerInfoResponses?.email,
        }),
      })

      const verifyJson = await verifyResponse.json().catch(() => ({}))
      if (!verifyResponse.ok || !verifyJson?.success) {
        throw new Error(verifyJson?.error || "Payment verification failed")
      }

      const paymentResult: PaymentResult = {
        paymentId: payment.id,
        txHash: verifyJson?.payment?.id || payment.id,
        sender: verifyJson?.payment?.sender,
        email: payment.payerInfoResponses?.email,
      }

      setResult(paymentResult)
      setStep("success")

      // Persist a non-PHI receipt to localStorage so the /wallet audit page can render it.
      try {
        if (typeof window !== "undefined") {
          const receipt = {
            paymentId: paymentResult.paymentId,
            txHash: paymentResult.txHash,
            sender: paymentResult.sender,
            amountUsd: amount,
            serviceName,
            serviceType: serviceType || serviceName,
            orderId,
            providerId,
            createdAt: Date.now(),
            network: basePayConfig.testnet ? "base-sepolia" : "base",
          }
          const raw = window.localStorage.getItem("basehealth:base-receipts")
          const list = raw ? (JSON.parse(raw) as unknown[]) : []
          if (Array.isArray(list)) {
            list.unshift(receipt)
            window.localStorage.setItem(
              "basehealth:base-receipts",
              JSON.stringify(list.slice(0, 50)),
            )
          }
        }
      } catch {
        /* receipts are best-effort, never block the success state */
      }

      onSuccess?.(paymentResult)
      
    } catch (err) {
      console.error('Base Pay error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      setStep('error')
      onError?.(errorMessage)
    }
  }, [amount, orderId, providerId, providerWallet, serviceName, serviceType, serviceDescription, collectEmail, onSuccess, onError])
  
  // Success state
  if (step === 'success' && result) {
    return (
      <Card className="max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Payment Complete!</h3>
          <p className="text-muted-foreground mb-4">
            ${amount.toFixed(2)} USDC paid for {serviceName}
          </p>
          
          <div className="bg-white rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
            <p className="font-mono text-sm break-all">{result.txHash || result.paymentId}</p>
          </div>
          
          <a
            href={`https://${basePayConfig.testnet ? 'sepolia.' : ''}basescan.org/tx/${result.txHash || result.paymentId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View on BaseScan <ExternalLink className="h-3 w-3" />
          </a>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <Link href="/support" className="hover:text-foreground hover:underline underline-offset-4">
              Tip or support growth
            </Link>
            <span className="text-muted-foreground/40">•</span>
            <Link href="/feedback" className="hover:text-foreground hover:underline underline-offset-4">
              Send feedback
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // Error state
  if (step === 'error') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error || 'Payment failed. Please try again.'}</AlertDescription>
          </Alert>
          <Button 
            className="w-full" 
            onClick={() => setStep('ready')}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  // Ready / Processing state
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">${amount.toFixed(2)}</CardTitle>
        <CardDescription>
          {serviceName}
          {providerName && ` with ${providerName}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2">
            <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-xs text-muted-foreground">~2 sec</p>
          </div>
          <div className="p-2">
            <Shield className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-muted-foreground">Secure</p>
          </div>
          <div className="p-2">
            <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-muted-foreground">No fees</p>
          </div>
        </div>
        
        {/* Base Pay Button */}
        <Button
          className="w-full h-14 text-lg bg-[#0052FF] hover:bg-[#0047E0] text-white"
          onClick={handlePayment}
          disabled={step === 'processing'}
        >
          {step === 'processing' ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <svg 
                className="mr-2 h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" fill="white" />
                <path 
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" 
                  fill="#0052FF"
                />
              </svg>
              Pay with Base
            </>
          )}
        </Button>
        
        {/* Network badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            {basePayConfig.testnet ? 'Base Sepolia (Testnet)' : 'Base Mainnet'}
          </Badge>
        </div>
        
        {/* Fine print */}
        <p className="text-xs text-center text-muted-foreground">
          Pay with USDC from your Base Account or Coinbase.
          <br />
          Confirm with Face ID, fingerprint, or passkey.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link href="/support" className="hover:text-foreground hover:underline underline-offset-4">
            Tip or support growth
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link href="/feedback" className="hover:text-foreground hover:underline underline-offset-4">
            Send feedback
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default BasePayCheckout
