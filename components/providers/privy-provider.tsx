"use client"

import { useState, useEffect, useCallback, type ReactNode } from 'react'

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.basehealth.xyz'
const isMainnet = process.env.NEXT_PUBLIC_USE_MAINNET === 'true' || process.env.NODE_ENV === 'production'

// Validate Privy App ID format (should be alphanumeric string)
function isValidPrivyAppId(id: string): boolean {
  return id.length > 10 && /^[a-z0-9]+$/i.test(id)
}

// Component that syncs user identity to database on login
// This is created dynamically after Privy loads to use the hooks correctly
function createIdentitySyncHandler(privyMod: any) {
  return function IdentitySyncHandler({ children }: { children: ReactNode }) {
    const { authenticated, user, getAccessToken } = privyMod.usePrivy()
    const { wallets } = privyMod.useWallets()
    const [synced, setSynced] = useState(false)
    
    useEffect(() => {
      const syncIdentity = async () => {
        if (authenticated && user && !synced) {
          try {
            const primaryWallet = wallets?.[0]
            const walletAddress = primaryWallet?.address || user?.wallet?.address
            
            // Get auth token
            const token = await getAccessToken()
            if (!token) return
            
            // Sync to database
            await fetch('/api/auth/privy/ensure-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                privyUserId: user.id,
                walletAddress,
                email: user.email?.address,
                phone: user.phone?.number,
              }),
            })
            
            setSynced(true)
            console.log('Identity synced to database:', user.id)
          } catch (error) {
            console.warn('Identity sync failed:', error)
          }
        }
      }
      
      syncIdentity()
    }, [authenticated, user, synced, wallets, getAccessToken])
    
    return <>{children}</>
  }
}

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [PrivyWrapper, setPrivyWrapper] = useState<React.ComponentType<{ children: ReactNode }> | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // Only load Privy on client and if valid App ID
    if (privyAppId && isValidPrivyAppId(privyAppId)) {
      import('@privy-io/react-auth').then((mod) => {
        import('viem/chains').then((chains) => {
          const { PrivyProvider: PrivyProviderBase } = mod
          const { base, baseSepolia } = chains
          
          // Create identity sync handler with access to Privy hooks
          const IdentitySyncHandler = createIdentitySyncHandler(mod)
          
          // Create wrapper component
          const Wrapper = ({ children }: { children: ReactNode }) => (
            <PrivyProviderBase
              appId={privyAppId}
              config={{
                // Wallet-only sign in (no email/phone prompts)
                loginMethods: ['wallet'],
                appearance: {
                  theme: 'light',
                  accentColor: '#0052FF',
                  logo: '/icon-192.png',
                  showWalletLoginFirst: true,
                },
                embeddedWallets: {
                  ethereum: {
                    createOnLogin: 'users-without-wallets',
                  },
                },
                defaultChain: isMainnet ? base : baseSepolia,
                supportedChains: [base, baseSepolia],
                walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
                legal: {
                  termsAndConditionsUrl: `${appUrl}/terms`,
                  privacyPolicyUrl: `${appUrl}/privacy`,
                },
              }}
            >
              <IdentitySyncHandler>
                {children}
              </IdentitySyncHandler>
            </PrivyProviderBase>
          )
          
          setPrivyWrapper(() => Wrapper)
        })
      }).catch((err) => {
        console.warn('Failed to load Privy:', err)
      })
    }
  }, [])

  // During SSR or before Privy loads, just render children
  if (!mounted || !PrivyWrapper) {
    return <>{children}</>
  }

  return <PrivyWrapper>{children}</PrivyWrapper>
}
