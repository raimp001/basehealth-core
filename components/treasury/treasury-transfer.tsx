"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { encodeFunctionData, isAddress, parseUnits } from "viem"
import { AlertTriangle, ExternalLink, Loader2, SendHorizontal, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { appendBaseBuilderCode } from "@/lib/base-builder-code"
import { PAYMENT_CONFIG } from "@/lib/network-config"

type TokenSymbol = "USDC" | "ETH"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.basehealth.xyz"

const USDC_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const

function shortAddress(address?: string | null) {
  if (!address) return "—"
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function TreasuryTransfer() {
  const treasuryAddress = (PAYMENT_CONFIG.recipientAddress || "").trim()
  const useMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === "true" || process.env.NODE_ENV === "production"
  const chainId = useMainnet ? 8453 : 84532
  const explorer = useMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"
  const usdcAddress = useMainnet
    ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

  const [provider, setProvider] = useState<any>(null)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [token, setToken] = useState<TokenSymbol>("USDC")
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")

  const canOperateTreasury = useMemo(() => {
    if (!treasuryAddress || !connectedAddress) return false
    return treasuryAddress.toLowerCase() === connectedAddress.toLowerCase()
  }, [treasuryAddress, connectedAddress])

  const connect = useCallback(async () => {
    setError(null)
    setTxHash(null)
    setConnecting(true)
    try {
      const { createBaseAccountSDK } = await import("@base-org/account")
      const sdk = createBaseAccountSDK({
        appName: "BaseHealth",
        appLogoUrl: `${APP_URL}/icon-192.png`,
        appChainIds: [8453, 84532],
      })

      const nextProvider = sdk.getProvider()
      if (!nextProvider) throw new Error("Wallet provider unavailable")

      const accounts = (await nextProvider.request({ method: "eth_requestAccounts" })) as string[]
      const address = accounts?.[0]
      if (!address) throw new Error("No wallet accounts returned")

      // Best-effort chain switch to Base
      const targetChainId = `0x${chainId.toString(16)}`
      try {
        await nextProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        })
      } catch (switchError: any) {
        if (switchError?.code === 4902) {
          await nextProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainId,
                chainName: useMainnet ? "Base" : "Base Sepolia",
                rpcUrls: [useMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"],
                blockExplorerUrls: [explorer],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          })
        }
      }

      setProvider(nextProvider)
      setConnectedAddress(address)
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet")
      setProvider(null)
      setConnectedAddress(null)
    } finally {
      setConnecting(false)
    }
  }, [chainId, explorer, useMainnet])

  useEffect(() => {
    // Best-effort read existing accounts from injected provider if available.
    const hydrate = async () => {
      try {
        const ethereum = (window as any).ethereum
        if (!ethereum) return
        const accounts = await ethereum.request({ method: "eth_accounts" })
        const address = accounts?.[0]
        if (address) {
          setProvider(ethereum)
          setConnectedAddress(address)
        }
      } catch {
        // ignore
      }
    }
    hydrate()
  }, [])

  const send = useCallback(async () => {
    setError(null)
    setTxHash(null)

    if (!provider) {
      setError("Connect a wallet first.")
      return
    }

    if (!treasuryAddress) {
      setError("Treasury address is not configured (NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS).")
      return
    }

    if (!canOperateTreasury) {
      setError("Connected wallet does not match the configured treasury address.")
      return
    }

    if (!isAddress(to)) {
      setError("Enter a valid recipient address.")
      return
    }

    const parsedAmount = Number.parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount.")
      return
    }

    setSending(true)
    try {
      if (token === "ETH") {
        const value = parseUnits(amount, 18)
        const hash = await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: treasuryAddress,
              to,
              value: `0x${value.toString(16)}`,
            },
          ],
        })
        setTxHash(hash)
        return
      }

      const value = parseUnits(amount, 6)
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, value],
      })
      const enrichedData = appendBaseBuilderCode(data) || data

      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: treasuryAddress,
            to: usdcAddress,
            data: enrichedData,
            value: "0x0",
          },
        ],
      })

      setTxHash(hash)
    } catch (err: any) {
      setError(err?.message || "Transfer failed")
    } finally {
      setSending(false)
    }
  }, [amount, canOperateTreasury, provider, to, token, treasuryAddress, usdcAddress])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Treasury Transfers
        </CardTitle>
        <CardDescription>
          Connect the treasury wallet to send refunds or payouts (no private keys stored on the server).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Needed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Treasury: {shortAddress(treasuryAddress)}</Badge>
          <Badge variant="secondary">Connected: {shortAddress(connectedAddress)}</Badge>
          {connectedAddress && (
            <Badge variant={canOperateTreasury ? "default" : "secondary"}>
              {canOperateTreasury ? "Treasury control" : "Not treasury wallet"}
            </Badge>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={connect} variant="outline" disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting…
              </>
            ) : (
              "Connect Treasury Wallet"
            )}
          </Button>
          {txHash && (
            <Button asChild variant="outline">
              <a href={`${explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                View tx <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Token</Label>
            <Select value={token} onValueChange={(v) => setToken(v as TokenSymbol)}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={token === "USDC" ? "10.00" : "0.01"} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Recipient Address</Label>
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." />
        </div>

        <Button onClick={send} disabled={sending || !connectedAddress} className="w-full gap-2">
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send
              <SendHorizontal className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground leading-5">
          Tip: For production, use a multisig or a dedicated smart wallet for treasury operations, and restrict access to
          trusted operators.
        </p>
      </CardContent>
    </Card>
  )
}
