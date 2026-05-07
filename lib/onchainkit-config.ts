/**
 * OnchainKit Configuration for Base Chain
 * Coinbase CDK integration with Base blockchain
 * Supports both Base Mainnet and Base Sepolia Testnet
 */

import { base, baseSepolia } from 'wagmi/chains'
import type { Chain } from 'wagmi/chains'

// Determine which network to use based on environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_NETWORK === 'base'
export const baseChain: Chain = isProduction ? base : baseSepolia

// OnchainKit configuration options
export const onchainKitConfig = {
  apiKey: process.env.NEXT_PUBLIC_COINBASE_CDP_API_KEY || '',
  rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || baseChain.rpcUrls.default.http[0],
  config: {
    appearance: {
      name: 'BaseHealth',
      logo: '/basehealth-logo.svg',
    },
    wallet: {
      preference: 'smartWalletOnly' as const,
    },
  },
}

// Export chain info for use in components
export const baseChainInfo = {
  id: baseChain.id,
  name: baseChain.name,
  network: (baseChain as any).network ?? baseChain.name,
  isProduction,
  blockExplorer: isProduction ? 'https://basescan.org' : 'https://sepolia.basescan.org',
  rpcUrl: baseChain.rpcUrls.default.http[0],
  nativeCurrency: baseChain.nativeCurrency,
}

