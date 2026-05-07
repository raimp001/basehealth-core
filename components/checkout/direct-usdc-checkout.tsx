'use client'

/**
 * Direct USDC Checkout Component
 * 
 * Simple wallet-based USDC payment that works with any wallet.
 * No special SDK required - just standard ERC20 transfer.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  Loader2, 
  Wallet,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { appendBaseBuilderCode } from "@/lib/base-builder-code"

interface DirectUsdcCheckoutProps {
  amount: number
  serviceName: string
  serviceDescription?: string
  onSuccess?: (txHash: string) => void
  onError?: (error: string) => void
}

// Base Sepolia USDC contract
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
const RECIPIENT =
  process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS || "0xcB335bb4a2d2151F4E17eD525b7874343B77Ba8b"

// Base Sepolia chain config
const BASE_SEPOLIA = {
  chainId: '0x14a34', // 84532 in hex
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
}

type Step = 'connect' | 'confirm' | 'processing' | 'success' | 'error'

export function DirectUsdcCheckout({
  amount,
  serviceName,
  serviceDescription,
  onSuccess,
  onError,
}: DirectUsdcCheckoutProps) {
  const [step, setStep] = useState<Step>('connect')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask or another wallet')
      }

      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Switch to Base Sepolia
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_SEPOLIA.chainId }],
        })
      } catch (switchError: any) {
        // Chain not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BASE_SEPOLIA],
          })
        } else {
          throw switchError
        }
      }

      setWalletAddress(accounts[0])
      setStep('confirm')
    } catch (err) {
      console.error('Connect error:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setStep('error')
    }
  }

  // Send USDC payment
  const sendPayment = async () => {
    if (!walletAddress) return
    
    setStep('processing')
    setError(null)

    try {
      // USDC has 6 decimals
      const amountInUnits = BigInt(Math.floor(amount * 1_000_000))
      
      // ERC20 transfer function signature
      const transferData =
        '0xa9059cbb' + // transfer(address,uint256)
        RECIPIENT.slice(2).padStart(64, '0') + // recipient address
        amountInUnits.toString(16).padStart(64, '0') // amount
      const data = appendBaseBuilderCode(transferData) || transferData

      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: USDC_ADDRESS,
          data,
        }],
      })

      setTxHash(txHash)
      setStep('success')
      onSuccess?.(txHash)

    } catch (err: any) {
      console.error('Payment error:', err)
      const message = err.message || 'Payment failed'
      setError(message.includes('user rejected') ? 'Transaction cancelled' : message)
      setStep('error')
      onError?.(message)
    }
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(RECIPIENT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`

  // Success state
  if (step === 'success' && txHash) {
    return (
      <Card className="max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Payment Sent!</h3>
          <p className="text-muted-foreground mb-4">
            ${amount.toFixed(2)} USDC for {serviceName}
          </p>
          
          <div className="bg-white rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
            <p className="font-mono text-xs break-all">{txHash}</p>
          </div>
          
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View on BaseScan <ExternalLink className="h-3 w-3" />
          </a>
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
            <AlertDescription>{error || 'Something went wrong'}</AlertDescription>
          </Alert>
          <Button 
            className="w-full" 
            onClick={() => {
              setError(null)
              setStep(walletAddress ? 'confirm' : 'connect')
            }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">${amount.toFixed(2)} USDC</CardTitle>
        <CardDescription>{serviceName}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Step 1: Connect Wallet */}
        {step === 'connect' && (
          <>
            <Button
              className="w-full h-14 text-lg"
              onClick={connectWallet}
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              MetaMask, Coinbase Wallet, or any Web3 wallet
            </p>
          </>
        )}

        {/* Step 2: Confirm Payment */}
        {step === 'confirm' && walletAddress && (
          <>
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From</span>
                <span className="font-mono">{shortAddress(walletAddress)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <button 
                  onClick={copyAddress}
                  className="font-mono flex items-center gap-1 hover:text-blue-600"
                >
                  {shortAddress(RECIPIENT)}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">${amount.toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span>Base Sepolia</span>
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg bg-[#0052FF] hover:bg-[#0047E0]"
              onClick={sendPayment}
            >
              Confirm Payment
            </Button>
          </>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Confirm in your wallet...</p>
          </div>
        )}

        {/* Network badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-xs">
            Base Sepolia (Testnet)
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Add ethereum type to window
// window.ethereum is declared in types/modules.d.ts

export default DirectUsdcCheckout
