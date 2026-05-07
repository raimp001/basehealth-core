"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  CreditCard,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  Info,
  Percent,
  Clock,
  FileText,
  AlertTriangle
} from "lucide-react"
import { SuperPayPayment } from "@/components/payment/superpay-payment"
import { WalletConnect } from "@/components/payment/wallet-connect"

interface PaymentFlowProps {
  amount: number
  appointmentId: string
  patientId?: string
  providerId?: string
  onSuccess?: (result: any) => void
  onCancel?: () => void
  cptCode?: string
  isUninsured?: boolean
}

interface PaymentMethod {
  id: string
  type: "card" | "crypto" | "insurance"
  name: string
  description: string
  discount?: number
  processingTime: string
  fees?: string
}

interface CardData {
  number: string
  expiry: string
  cvv: string
  name: string
  billingAddress: {
    street: string
    city: string
    state: string
    zip: string
  }
}

export function ImprovedPaymentFlow({ 
  amount, 
  appointmentId, 
  patientId, 
  providerId, 
  onSuccess, 
  onCancel,
  cptCode = "",
  isUninsured = false
}: PaymentFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savePaymentMethod, setSavePaymentMethod] = useState(false)
  const [showGoodFaithEstimate, setShowGoodFaithEstimate] = useState(isUninsured)

  // Form states
  const [cardForm, setCardForm] = useState({
    number: "",
    expiry: "",
    cvc: "",
    name: "",
    zipCode: "",
    street: "",
    city: "",
    state: ""
  })

  const [cryptoForm, setCryptoForm] = useState({
    walletAddress: "",
    currency: "ETH",
    network: "base"
  })

  const [insuranceForm, setInsuranceForm] = useState({
    policyNumber: "",
    groupNumber: "",
    subscriberName: "",
    dateOfBirth: ""
  })

  // Calculate totals
  const discountAmount = selectedMethod === "crypto" ? amount * 0.025 : 0
  const finalAmount = amount - discountAmount

  const paymentMethods: PaymentMethod[] = [
    {
      id: "card",
      type: "card",
      name: "Credit/Debit Card",
      description: "Pay securely with your card",
      processingTime: "Instant",
      fees: "2.9% + $0.30"
    },
    {
      id: "crypto",
      type: "crypto", 
      name: "Cryptocurrency",
      description: "Pay with ETH, USDC on Base network",
      discount: 2.5,
      processingTime: "1-3 minutes",
      fees: "Network fees apply"
    },
    {
      id: "insurance",
      type: "insurance",
      name: "Insurance Coverage",
      description: "Use your health insurance",
      processingTime: "24-48 hours",
      fees: "Copay only"
    }
  ]

  const steps = [
    { number: 1, title: "Payment Method", description: "Choose how to pay" },
    { number: 2, title: "Details", description: "Enter payment details" },
    { number: 3, title: "Review", description: "Confirm your payment" },
    { number: 4, title: "Complete", description: "Payment processed" }
  ]

  const handleNext = () => {
    setError(null)
    
    if (currentStep === 1) {
      if (!selectedMethod) {
        setError("Please select a payment method")
        return
      }
      if (isUninsured && !showGoodFaithEstimate) {
        setError("You must acknowledge receipt of the Good Faith Estimate to proceed")
        return
      }
    }

    if (currentStep === 2 && selectedMethod === "card") {
      const errors = validateCardData()
      if (errors.length > 0) {
        setError(errors.join(", "))
        return
      }
    }

    if (currentStep === 3) {
      if (!showGoodFaithEstimate) {
        setError("Please agree to the terms and conditions")
        return
      }
      if (isUninsured && !showGoodFaithEstimate) {
        setError("Good Faith Estimate acknowledgment is required")
        return
      }
    }

    setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
    setError(null)
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock successful response
      const result = {
        transactionId: `tx_${Date.now()}`,
        amount: finalAmount,
        method: selectedMethod,
        status: "completed",
        timestamp: new Date().toISOString()
      }

      onSuccess?.(result)
    } catch (err) {
      setError("Payment processing failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()
  }

  const validateCardData = () => {
    const errors = []
    if (!cardForm.number || cardForm.number.length < 13) errors.push("Valid card number required")
    if (!cardForm.expiry || !/^\d{2}\/\d{2}$/.test(cardForm.expiry)) errors.push("Valid expiry date required (MM/YY)")
    if (!cardForm.cvc || cardForm.cvc.length < 3) errors.push("Valid CVV required")
    if (!cardForm.name) errors.push("Cardholder name required")
    return errors
  }

  const renderPaymentMethodStep = () => (
    <div className="space-y-4">
      {/* Good Faith Estimate - Required for uninsured patients */}
      {isUninsured && (
        <Alert className="bg-blue-50 border-blue-200">
          <FileText className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Good Faith Estimate (Required by Federal Law):</strong>
            <div className="mt-2 space-y-1">
              <p>• Service: Healthcare consultation (CPT: {cptCode})</p>
              <p>• Estimated Cost: ${amount.toFixed(2)}</p>
              <p>• You have the right to receive this estimate before your appointment</p>
              <p>• If the final bill is $400 or more above this estimate, you can dispute the bill</p>
            </div>
            <div className="mt-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="acknowledge-estimate" 
                  checked={showGoodFaithEstimate}
                  onCheckedChange={(checked) => setShowGoodFaithEstimate(checked === true)}
                />
                <Label htmlFor="acknowledge-estimate" className="text-sm">
                  I acknowledge receipt of this Good Faith Estimate
                </Label>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-2">Select Payment Method</h3>
        <p className="text-muted-foreground text-sm">Choose how you'd like to pay for your healthcare services</p>
      </div>

      <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
        {paymentMethods.map((method) => (
          <div key={method.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={method.id} id={method.id} />
              <Label 
                htmlFor={method.id} 
                className="flex-1 cursor-pointer border rounded-lg p-4 hover:bg-muted/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {method.type === "card" && <CreditCard className="h-5 w-5" />}
                      {method.type === "crypto" && <Wallet className="h-5 w-5" />}
                      {method.type === "insurance" && <Shield className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{method.name}</p>
                        {method.discount && (
                          <Badge variant="secondary" className="text-green-600">
                            <Percent className="h-3 w-3 mr-1" />
                            {method.discount}% off
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {method.processingTime}
                        </span>
                        <span>Fees: {method.fees}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </div>
        ))}
      </RadioGroup>

      {/* CMS Compliance Notice */}
      <Alert className="bg-green-50 border-green-200">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Patient Rights & Protections:</strong>
          <div className="mt-1 text-sm">
            • You have the right to receive clear pricing information before treatment
            • All billing practices comply with CMS regulations and No Surprise Billing Act
            • You may request an itemized bill after service completion
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )

  const renderPaymentDetailsStep = () => {
    if (selectedMethod === "card") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Card Information</h3>
            <p className="text-muted-foreground text-sm">Enter your payment details securely</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <Input
                id="card-number"
                placeholder="1234 5678 9012 3456"
                value={formatCardNumber(cardForm.number)}
                onChange={(e) => setCardForm({
                  ...cardForm, 
                  number: e.target.value.replace(/\s/g, '')
                })}
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardForm.expiry}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length >= 2) {
                      value = value.substring(0,2) + '/' + value.substring(2,4)
                    }
                    setCardForm({...cardForm, expiry: value})
                  }}
                  maxLength={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVV</Label>
                <Input
                  id="cvc"
                  placeholder="123"
                  value={cardForm.cvc}
                  onChange={(e) => setCardForm({
                    ...cardForm, 
                    cvc: e.target.value.replace(/\D/g, '').substring(0,4)
                  })}
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Cardholder Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={cardForm.name}
                onChange={(e) => setCardForm({...cardForm, name: e.target.value})}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Billing Address</h4>
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  placeholder="123 Main St"
                  value={cardForm.street}
                  onChange={(e) => setCardForm({
                    ...cardForm,
                    street: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={cardForm.city}
                    onChange={(e) => setCardForm({
                      ...cardForm,
                      city: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={cardForm.state}
                    onChange={(e) => setCardForm({
                      ...cardForm,
                      state: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  placeholder="12345"
                  value={cardForm.zipCode}
                  onChange={(e) => setCardForm({
                    ...cardForm,
                    zipCode: e.target.value
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (selectedMethod === "crypto") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Cryptocurrency Payment</h3>
            <p className="text-muted-foreground text-sm">Connect your wallet to pay with crypto</p>
          </div>
          <SuperPayPayment 
            amount={finalAmount} 
            appointmentId={appointmentId}
            patientId={patientId}
            providerId={providerId}
          />
        </div>
      )
    }

    if (selectedMethod === "insurance") {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Insurance Information</h3>
            <p className="text-muted-foreground text-sm">We'll process your insurance claim</p>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Insurance claims typically take 24-48 hours to process. You'll receive a confirmation email once approved.
            </AlertDescription>
          </Alert>
        </div>
      )
    }
  }

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Review Your Payment</h3>
        <p className="text-muted-foreground text-sm">Please review your payment details before confirming</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between">
            <span>Service Fee (CPT: {cptCode}):</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          
          {selectedMethod === "crypto" && (
            <div className="flex justify-between text-green-600">
              <span>Crypto Discount (2.5%):</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>

          {/* CMS Billing Information */}
          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
            <strong>Billing Information:</strong>
            <div>Provider NPI: {providerId || "1234567890"}</div>
            <div>Service Date: {new Date().toLocaleDateString()}</div>
            <div>Place of Service: 11 (Office)</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isUninsured && !showGoodFaithEstimate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must acknowledge receipt of the Good Faith Estimate before proceeding.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="save-method" 
            checked={savePaymentMethod}
            onCheckedChange={(checked) => setSavePaymentMethod(checked === true)}
          />
          <Label htmlFor="save-method" className="text-sm">
            Save this payment method for future use (PCI DSS compliant storage)
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms" 
            checked={showGoodFaithEstimate}
            onCheckedChange={(checked) => setShowGoodFaithEstimate(checked === true)}
          />
          <Label htmlFor="terms" className="text-sm">
            I agree to the <a href="#" className="text-primary underline">Terms of Service</a>, 
            <a href="#" className="text-primary underline"> Privacy Policy</a>, and 
            <a href="#" className="text-primary underline"> Patient Financial Responsibility Agreement</a>
          </Label>
        </div>

        {/* No Surprise Billing Notice */}
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            <strong>No Surprise Billing Protection:</strong> You are protected from surprise billing under federal law. 
            If you receive care from an out-of-network provider, you may be protected from surprise billing. 
            Contact your health plan for more information.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 bg-green-100 rounded-full">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground">
          Your payment of ${finalAmount.toFixed(2)} has been processed successfully.
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg text-left">
        <h4 className="font-medium mb-2">Payment Details</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Transaction ID:</span>
            <span className="font-mono">tx_{Date.now()}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span className="capitalize">{selectedMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span>${finalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Button onClick={onSuccess} className="w-full">
        Continue to Appointment
      </Button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep >= step.number 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground text-muted-foreground'
            }`}>
              {currentStep > step.number ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{step.number}</span>
              )}
            </div>
            <div className="ml-2 hidden sm:block">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${
                currentStep > step.number ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      <Progress value={(currentStep / steps.length) * 100} className="h-2" />

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Secure Payment
          </CardTitle>
          <CardDescription>
            Your payment information is encrypted and secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && renderPaymentMethodStep()}
          {currentStep === 2 && renderPaymentDetailsStep()}
          {currentStep === 3 && renderReviewStep()}
          {currentStep === 4 && renderCompleteStep()}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentStep < 4 && (
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={currentStep === 1 ? onCancel : handleBack}
                disabled={isProcessing}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {currentStep === 1 ? "Cancel" : "Back"}
              </Button>
              
              <Button 
                onClick={currentStep === 3 ? handleSubmit : handleNext}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : currentStep === 3 ? (
                  <>Pay ${finalAmount.toFixed(2)}</>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 