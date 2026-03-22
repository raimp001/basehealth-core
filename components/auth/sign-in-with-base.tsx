'use client'

/**
 * Sign In with Base - One-tap authentication using Base Smart Wallet
 * 
 * Provides seamless authentication for users with:
 * - Coinbase account (one-tap)
 * - Base Smart Wallet
 * - Any connected wallet
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Wallet, LogOut, ChevronDown, Copy, ExternalLink, Check } from 'lucide-react'
import { signIn, signOut, useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildWalletSignInMessage } from "@/lib/wallet-signin-message"
import { useMiniApp } from "@/components/providers/miniapp-provider"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.basehealth.xyz"

interface SignInWithBaseProps {
  className?: string
  mode?: "connect" | "signin"
  onWalletConnected?: (address: string) => void
  onAuthSuccess?: (address: string) => void
  onAuthError?: (error: string) => void
}

export function SignInWithBase({ 
  className = '',
  mode = "connect",
  onWalletConnected,
  onAuthSuccess,
  onAuthError,
}: SignInWithBaseProps) {
  const { data: session, status: sessionStatus } = useSession()
  const { isMiniApp, user: miniAppUser, openUrl, getEthereumProvider } = useMiniApp()
  const [mounted, setMounted] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sdk, setSdk] = useState<any>(null)
  const [sdkLoading, setSdkLoading] = useState(false)

  const WALLET_STORAGE_KEY = "basehealth_wallet_address"

  const onWalletConnectedRef = useRef(onWalletConnected)
  const lastNotifiedRef = useRef<string | null>(null)

  useEffect(() => {
    onWalletConnectedRef.current = onWalletConnected
  }, [onWalletConnected])

  const isWalletAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test((addr || "").trim())

  const notifyWalletConnected = useCallback((address: string) => {
    const normalized = (address || "").trim()
    if (!isWalletAddress(normalized)) return

    try {
      window.localStorage.setItem(WALLET_STORAGE_KEY, normalized)
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(new CustomEvent("basehealth:wallet", { detail: { address: normalized } }))
    } catch {
      // ignore
    }

    try {
      onWalletConnectedRef.current?.(normalized)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const sessionWallet = (session?.user as any)?.walletAddress
    if (typeof sessionWallet === "string" && isWalletAddress(sessionWallet)) {
      setWalletAddress((prev) => prev || sessionWallet)
    }
  }, [session])

  useEffect(() => {
    if (!walletAddress) return
    if (walletAddress === lastNotifiedRef.current) return
    lastNotifiedRef.current = walletAddress
    notifyWalletConnected(walletAddress)
  }, [walletAddress, notifyWalletConnected])

  const ensureBaseAccountSdk = useCallback(async () => {
    if (sdk) return sdk
    if (sdkLoading) return null

    setSdkLoading(true)
    try {
      const { createBaseAccountSDK } = await import('@base-org/account')
      const baseSDK = createBaseAccountSDK({
        appName: 'BaseHealth',
        appLogoUrl: `${APP_URL}/icon-192.png`,
        appChainIds: [8453, 84532],
      })
      setSdk(baseSDK)
      return baseSDK
    } catch (error) {
      console.warn('Base Account SDK not available')
      return null
    } finally {
      setSdkLoading(false)
    }
  }, [sdk, sdkLoading])

  const getDirectProvider = useCallback(async () => {
    if (isMiniApp) {
      const miniAppProvider = await getEthereumProvider()
      if (miniAppProvider) return miniAppProvider
    }

    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : null
    return ethereum || null
  }, [getEthereumProvider, isMiniApp])

  useEffect(() => {
    setMounted(true)

    try {
      const saved = window.localStorage.getItem(WALLET_STORAGE_KEY) || ""
      if (saved && isWalletAddress(saved)) {
        setWalletAddress((prev) => prev || saved)
      }
    } catch {
      // ignore
    }

    let cancelled = false

    const initWalletState = async () => {
      const directProvider = await getDirectProvider()
      if (directProvider) {
        try {
          const accounts = await directProvider.request({ method: "eth_accounts" })
          if (!cancelled && typeof accounts?.[0] === "string" && isWalletAddress(accounts[0])) {
            setWalletAddress((prev) => prev || accounts[0].trim())
          }
        } catch {
          // ignore
        }
        return
      }

      const baseSdk = await ensureBaseAccountSdk()
      try {
        const provider = baseSdk?.getProvider?.()
        const accounts = provider ? await provider.request({ method: "eth_accounts" }) : []
        if (!cancelled && typeof accounts?.[0] === "string" && isWalletAddress(accounts[0])) {
          setWalletAddress((prev) => prev || accounts[0].trim())
        }
      } catch {
        // ignore
      }
    }

    initWalletState()

    return () => {
      cancelled = true
    }
  }, [ensureBaseAccountSdk, getDirectProvider])

  const getProvider = useCallback(async () => {
    // Prefer the host wallet provider first so Base app / Coinbase Wallet / injected wallets
    // do not fall through to the Base Account email/passkey flow unexpectedly.
    const directProvider = await getDirectProvider()
    if (directProvider) return directProvider

    const availableSdk = sdk || (await ensureBaseAccountSdk())
    if (availableSdk) {
      const baseAccountProvider = availableSdk.getProvider()
      if (baseAccountProvider) return baseAccountProvider
    }
    return null
  }, [ensureBaseAccountSdk, getDirectProvider, sdk])

  const connectWallet = useCallback(async () => {
    setIsConnecting(true)
    setIsSigning(false)
    
    try {
      const provider = await getProvider()
      if (!provider) {
        onAuthError?.(
          isMiniApp
            ? "Wallet provider unavailable in the Base app. Please try again."
            : "No wallet detected. Open this in the Base app or install a wallet extension.",
        )
        return null
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" })
      const nextAddress = typeof accounts?.[0] === "string" ? accounts[0].trim() : ""
      if (!nextAddress) {
        onAuthError?.("No accounts found. Please create an account in your wallet.")
        return null
      }

      // Best-effort chain switch to Base (mainnet or sepolia).
      const useMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === "true" || process.env.NODE_ENV === "production"
      const targetChainId = useMainnet ? "0x2105" : "0x14a34"
      const chainName = useMainnet ? "Base" : "Base Sepolia"
      const rpcUrl = useMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"
      const explorer = useMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"

      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        })
      } catch (switchError: any) {
        if (switchError?.code === 4902) {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainId,
                chainName,
                rpcUrls: [rpcUrl],
                blockExplorerUrls: [explorer],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              },
            ],
          })
        }
      }

      setWalletAddress(nextAddress)
      return nextAddress
    } catch (error: any) {
      console.error("Wallet connect error:", error)
      onAuthError?.(error.message || "Wallet connect failed")
      return null
    } finally {
      setIsConnecting(false)
    }
  }, [getProvider, isMiniApp, onAuthError])

  const signInToBaseHealth = useCallback(
    async (address: string) => {
      setIsSigning(true)
      setIsConnecting(false)

      try {
        const provider = await getProvider()
        if (!provider) throw new Error("Wallet provider unavailable")

        // Ensure account permissions are granted before signing.
        // Some mini app providers throw "Must call eth_requestAccounts before other methods".
        const requestedAccounts = await provider.request({ method: "eth_requestAccounts" })
        const providerAddress =
          typeof requestedAccounts?.[0] === "string" && isWalletAddress(requestedAccounts[0])
            ? requestedAccounts[0].trim()
            : null

        let signingAddress = (address || "").trim()
        if (providerAddress) {
          signingAddress = providerAddress
          setWalletAddress(providerAddress)
        }
        if (!isWalletAddress(signingAddress)) {
          throw new Error("Wallet permission is required. Please connect your wallet and try again.")
        }

        const nonceResponse = await fetch("/api/auth/wallet/nonce", { cache: "no-store" })
        const nonceJson = await nonceResponse.json()
        if (!nonceResponse.ok || !nonceJson?.nonce) {
          throw new Error(nonceJson?.error || "Failed to prepare sign-in")
        }

        const useMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === "true" || process.env.NODE_ENV === "production"
        const chainId = useMainnet ? 8453 : 84532
        const message = buildWalletSignInMessage({
          domain: window.location.host,
          uri: window.location.origin,
          address: signingAddress,
          chainId,
          nonce: nonceJson.nonce,
          issuedAt: new Date().toISOString(),
        })

        // Some wallets expect [message, address], others [address, message].
        let signature: string | null = null
        try {
          signature = await provider.request({
            method: "personal_sign",
            params: [message, signingAddress],
          })
        } catch {
          signature = await provider.request({
            method: "personal_sign",
            params: [signingAddress, message],
          })
        }

        if (!signature) throw new Error("No signature returned from wallet")

        const result = await signIn("wallet", {
          redirect: false,
          address: signingAddress,
          message,
          signature,
        })

        if (result?.error) {
          throw new Error(result.error)
        }

        onAuthSuccess?.(signingAddress)
      } catch (error: any) {
        console.error("Wallet sign-in error:", error)
        onAuthError?.(error.message || "Sign in failed")
      } finally {
        setIsSigning(false)
      }
    },
    [getProvider, onAuthSuccess, onAuthError],
  )

  const handleSignIn = useCallback(async () => {
    const connectedAddress = walletAddress || (await connectWallet())
    if (!connectedAddress) return
    if (mode === "signin") {
      await signInToBaseHealth(connectedAddress)
    }
  }, [walletAddress, connectWallet, signInToBaseHealth, mode])

  const handleSignOut = useCallback(() => {
    signOut({ redirect: false }).catch(() => null)
    setWalletAddress(null)
    try {
      window.localStorage.removeItem(WALLET_STORAGE_KEY)
    } catch {
      // ignore
    }
    try {
      window.dispatchEvent(new CustomEvent("basehealth:wallet", { detail: { address: null } }))
    } catch {
      // ignore
    }
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const profileName =
    (miniAppUser?.displayName && miniAppUser.displayName.trim()) ||
    (miniAppUser?.username && `@${miniAppUser.username}`) ||
    session?.user?.name ||
    "Wallet"

  const profileHandle = miniAppUser?.username ? `@${miniAppUser.username}` : null
  const avatarUrl = miniAppUser?.pfpUrl || (session?.user as any)?.image || null
  const avatarFallback =
    (miniAppUser?.displayName || miniAppUser?.username || session?.user?.name || "U")
      .trim()
      .slice(0, 1)
      .toUpperCase()
  const isAuthenticated = sessionStatus === "authenticated"

  // Prevent hydration errors
  if (!mounted) {
    return (
      <button 
        className={`inline-flex items-center justify-center gap-2 rounded-full h-10 px-4 bg-accent text-accent-foreground font-semibold shadow-glow-subtle transition-colors hover:bg-accent/90 ${className}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="white" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#0052FF" />
        </svg>
        Sign in with Base
      </button>
    )
  }

  // Not connected - show Sign In with Base button
  if (!walletAddress) {
    return (
      <button
        onClick={handleSignIn}
        disabled={isConnecting || isSigning}
        className={`inline-flex items-center justify-center gap-2.5 rounded-full h-10 px-5 font-semibold shadow-glow-subtle transition-colors hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60 bg-accent text-accent-foreground ${className}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="white" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#0052FF" />
        </svg>
        {isConnecting
          ? "Connecting..."
          : isSigning
            ? "Signing..."
            : mode === "signin"
              ? "Sign in with Base"
              : "Connect wallet"}
      </button>
    )
  }

  if (mode === "signin" && !isAuthenticated) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <button
          onClick={() => signInToBaseHealth(walletAddress)}
          disabled={isSigning || isConnecting}
          className="inline-flex items-center justify-center gap-2.5 rounded-full h-10 px-5 font-semibold shadow-glow-subtle transition-colors hover:bg-accent/90 active:scale-[0.98] disabled:opacity-60 bg-accent text-accent-foreground"
        >
          <Wallet className="h-4 w-4" />
          {isSigning ? "Signing..." : "Complete BaseHealth sign-in"}
        </button>
        <button
          onClick={handleSignOut}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full h-10 px-5 font-medium border border-border/60 bg-card/25 text-foreground transition-colors hover:bg-card/35"
        >
          Disconnect {formatAddress(walletAddress)}
        </button>
      </div>
    )
  }

  // Connected - show wallet menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`inline-flex items-center gap-2 rounded-full h-10 px-3 border border-border/60 bg-card/25 backdrop-blur-md shadow-glow-subtle hover:bg-card/35 transition-colors ${className}`}
        >
          <span className="relative">
            <Avatar className="h-6 w-6 ring-1 ring-border/60">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
              <AvatarFallback className="text-[11px] font-semibold">{avatarFallback}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </span>
          <span className="text-sm font-medium max-w-[10rem] truncate">{profileName}</span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72 border-border/60 bg-popover/90 backdrop-blur-xl shadow-glow-subtle">
        <DropdownMenuLabel className="py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-1 ring-border/60">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileName} /> : null}
              <AvatarFallback className="text-sm font-semibold">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight truncate">{profileName}</div>
              <div className="text-xs text-muted-foreground leading-tight truncate">
                {profileHandle ?? (isAuthenticated ? "Recognized by BaseHealth" : "Wallet connected")}
              </div>
            </div>
            <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full border border-accent/20 bg-accent/10 text-accent">
              {isAuthenticated ? "Signed in" : "Wallet only"}
            </span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-muted/60" />
        
        {/* Wallet address */}
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => copyAddress(walletAddress)}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          <span>Copy address</span>
          <span className="ml-auto text-xs font-mono text-muted-foreground">{formatAddress(walletAddress)}</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-muted/60" />
        
        {/* View on explorer */}
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => {
            const useMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === "true" || process.env.NODE_ENV === "production"
            const explorerBase = useMainnet ? "https://basescan.org" : "https://sepolia.basescan.org"
            openUrl(`${explorerBase}/address/${walletAddress}`)
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View on BaseScan
        </DropdownMenuItem>

        {sessionStatus !== "authenticated" && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => signInToBaseHealth(walletAddress)}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Sign in to BaseHealth
          </DropdownMenuItem>
        )}
        
        {/* Disconnect */}
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={handleSignOut}
          style={{ color: '#dc6464' }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SignInWithBase
