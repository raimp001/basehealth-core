'use client'

/**
 * Mini App Provider
 * 
 * Initializes the Base mini app SDK when running inside the Base app.
 * Calls sdk.actions.ready() to hide splash screen and display app.
 */

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
// `MiniAppContext` is no longer exported from `@farcaster/miniapp-core` — type as any for now.
type FarcasterMiniAppContext = any
import { useCallback } from 'react'

interface MiniAppProviderContext {
  isMiniApp: boolean
  isReady: boolean
  sdk: any | null
  context: FarcasterMiniAppContext | null
  user: FarcasterMiniAppContext['user'] | null
  openUrl: (url: string) => void
  getEthereumProvider: () => Promise<any | null>
}

const MiniAppContext = createContext<MiniAppProviderContext>({
  isMiniApp: false,
  isReady: false,
  sdk: null,
  context: null,
  user: null,
  openUrl: (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  },
  getEthereumProvider: async () => {
    if (typeof window !== 'undefined') return (window as any).ethereum || null
    return null
  },
})

export function useMiniApp() {
  return useContext(MiniAppContext)
}

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [isMiniApp, setIsMiniApp] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [sdk, setSdk] = useState<any>(null)
  const [context, setContext] = useState<FarcasterMiniAppContext | null>(null)
  const [user, setUser] = useState<FarcasterMiniAppContext['user'] | null>(null)

  useEffect(() => {
    const initMiniApp = async () => {
      const READY_TIMEOUT_MS = 1500
      const CONTEXT_TIMEOUT_MS = 1500

      try {
        const { sdk: miniAppSdk } = await import('@farcaster/miniapp-sdk')
        setSdk(miniAppSdk)

        const inMiniApp =
          typeof miniAppSdk?.isInMiniApp === 'function' ? await miniAppSdk.isInMiniApp() : false

        setIsMiniApp(Boolean(inMiniApp))

        if (inMiniApp && typeof miniAppSdk?.actions?.ready === 'function') {
          // Some preview environments may not respond; don't hang the app.
          await Promise.race([
            miniAppSdk.actions.ready(),
            new Promise((resolve) => setTimeout(resolve, READY_TIMEOUT_MS)),
          ])
        }

        if (inMiniApp) {
          try {
            const resolvedContext = await Promise.race([
              miniAppSdk.context,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), CONTEXT_TIMEOUT_MS)),
            ])

            if (resolvedContext) {
              setContext(resolvedContext as FarcasterMiniAppContext)
              setUser((resolvedContext as FarcasterMiniAppContext)?.user ?? null)
            }
          } catch (error) {
            console.warn('Failed to load mini app context:', error)
          }
        }
      } catch (error) {
        console.warn('Mini app SDK not available:', error)
      } finally {
        setIsReady(true)
      }
    }

    initMiniApp()
  }, [])

  const openUrl = useCallback((url: string) => {
    const trimmed = (url || '').trim()
    if (!trimmed) return

    const open = sdk?.actions?.openUrl
    if (typeof open === 'function') {
      try {
        open(trimmed)
        return
      } catch {
        // Fall through to window.open.
      }
    }

    if (typeof window !== 'undefined') {
      window.open(trimmed, '_blank', 'noopener,noreferrer')
    }
  }, [sdk])

  const getEthereumProvider = useCallback(async () => {
    try {
      const getter = sdk?.wallet?.getEthereumProvider
      if (typeof getter === 'function') {
        return await getter()
      }
    } catch (error) {
      console.warn('Failed to load mini app wallet provider:', error)
    }

    if (typeof window !== 'undefined') return (window as any).ethereum || null
    return null
  }, [sdk])

  return (
    <MiniAppContext.Provider value={{ isMiniApp, isReady, sdk, context, user, openUrl, getEthereumProvider }}>
      {children}
    </MiniAppContext.Provider>
  )
}
