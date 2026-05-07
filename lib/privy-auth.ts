/**
 * Server-side Privy Authentication
 * 
 * Utilities for verifying Privy auth tokens on API routes.
 */

import { NextRequest } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'

// Initialize Privy client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
)

export interface PrivyAuthResult {
  authenticated: boolean
  userId?: string
  walletAddress?: string
  error?: string
}

/**
 * Verify Privy auth token from request
 * 
 * Usage in API routes:
 * ```
 * const auth = await requirePrivyAuth(request)
 * if (!auth.authenticated) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 })
 * }
 * // Use auth.userId, auth.walletAddress
 * ```
 */
export async function requirePrivyAuth(request: NextRequest): Promise<PrivyAuthResult> {
  try {
    // Check for Privy app ID
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      console.warn('Privy not configured - skipping auth')
      return { authenticated: true, userId: 'dev-user' }
    }

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Missing authorization header',
      }
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token with Privy
    const verifiedClaims = await privy.verifyAuthToken(token)

    return {
      authenticated: true,
      userId: verifiedClaims.userId,
      walletAddress: (verifiedClaims as any).wallet?.address,
    }
  } catch (error) {
    console.error('Privy auth error:', error)
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

/**
 * Get Privy user by ID
 */
export async function getPrivyUser(userId: string) {
  try {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      return null
    }

    const user = await privy.getUser(userId)
    return user
  } catch (error) {
    console.error('Failed to get Privy user:', error)
    return null
  }
}

/**
 * Extract auth token from request cookies (for SSR pages)
 */
export function getAuthTokenFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies
  const authCookie = cookies.get('privy-token')
  return authCookie?.value || null
}

/**
 * Middleware helper - verify auth and return user info
 */
export async function verifyAuthMiddleware(request: NextRequest): Promise<{
  isValid: boolean
  userId?: string
  redirect?: string
}> {
  // Check authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const result = await requirePrivyAuth(request)
    return {
      isValid: result.authenticated,
      userId: result.userId,
    }
  }

  // Fall back to cookie-based auth
  const token = getAuthTokenFromCookies(request)
  if (!token) {
    return {
      isValid: false,
      redirect: '/login',
    }
  }

  try {
    const verifiedClaims = await privy.verifyAuthToken(token)
    return {
      isValid: true,
      userId: verifiedClaims.userId,
    }
  } catch (error) {
    return {
      isValid: false,
      redirect: '/login',
    }
  }
}
