/**
 * Solana Payment Service
 * 
 * Provides payment functionality on the Solana blockchain.
 * Supports SOL and USDC (SPL Token) payments.
 * 
 * @module solana-payment-service
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Cluster,
} from '@solana/web3.js'

// =============================================================================
// CONFIGURATION
// =============================================================================

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet'

export const solanaConfig = {
  network: (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as SolanaNetwork,
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet'),
  
  // USDC SPL Token addresses
  usdcMint: {
    'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
    'testnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  
  // Payment recipient wallet
  recipientWallet: process.env.NEXT_PUBLIC_SOLANA_RECIPIENT_WALLET || '',
  
  // Confirmation commitment level
  commitment: 'confirmed' as const,
}

// =============================================================================
// TYPES
// =============================================================================

export interface SolanaPaymentRequest {
  amount: number
  currency: 'SOL' | 'USDC'
  recipientAddress?: string
  memo?: string
  metadata?: {
    orderId?: string
    userId?: string
    service?: string
    description?: string
  }
}

export interface SolanaPaymentResult {
  success: boolean
  transactionSignature?: string
  error?: string
  explorerUrl?: string
  amount: number
  currency: string
  recipientAddress: string
  timestamp: Date
}

export interface SolanaWalletBalance {
  sol: number
  usdc: number
  walletAddress: string
}

export interface SolanaTransactionStatus {
  confirmed: boolean
  slot?: number
  blockTime?: number
  error?: string
}

// =============================================================================
// CONNECTION
// =============================================================================

let connectionInstance: Connection | null = null

/**
 * Get or create a Solana connection
 */
export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(solanaConfig.rpcUrl, solanaConfig.commitment)
  }
  return connectionInstance
}

/**
 * Get the explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  const network = solanaConfig.network
  const baseUrl = 'https://explorer.solana.com'
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`
  return `${baseUrl}/tx/${signature}${cluster}`
}

// =============================================================================
// BALANCE QUERIES
// =============================================================================

/**
 * Get SOL balance for a wallet
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection()
    const publicKey = new PublicKey(walletAddress)
    const balance = await connection.getBalance(publicKey)
    return balance / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error)
    return 0
  }
}

/**
 * Get USDC balance for a wallet
 */
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection()
    const walletPublicKey = new PublicKey(walletAddress)
    const usdcMint = new PublicKey(solanaConfig.usdcMint[solanaConfig.network])
    
    // Get token accounts for USDC
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
      { mint: usdcMint }
    )
    
    if (tokenAccounts.value.length === 0) {
      return 0
    }
    
    // Sum up all USDC balances
    let totalBalance = 0
    for (const account of tokenAccounts.value) {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount
      totalBalance += amount || 0
    }
    
    return totalBalance
  } catch (error) {
    console.error('Error getting USDC balance:', error)
    return 0
  }
}

/**
 * Get full wallet balance (SOL and USDC)
 */
export async function getWalletBalance(walletAddress: string): Promise<SolanaWalletBalance> {
  const [sol, usdc] = await Promise.all([
    getSolBalance(walletAddress),
    getUsdcBalance(walletAddress),
  ])
  
  return {
    sol,
    usdc,
    walletAddress,
  }
}

// =============================================================================
// TRANSACTION BUILDING
// =============================================================================

/**
 * Create a SOL transfer transaction
 */
export async function createSolTransferTransaction(
  senderAddress: string,
  recipientAddress: string,
  amountInSol: number
): Promise<Transaction> {
  const connection = getConnection()
  
  const senderPublicKey = new PublicKey(senderAddress)
  const recipientPublicKey = new PublicKey(recipientAddress)
  
  const lamports = Math.round(amountInSol * LAMPORTS_PER_SOL)
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: recipientPublicKey,
      lamports,
    })
  )
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = senderPublicKey
  transaction.lastValidBlockHeight = lastValidBlockHeight
  
  return transaction
}

/**
 * Create a USDC transfer transaction (SPL Token)
 * Note: This requires the sender's token account and uses associated token accounts
 */
export async function createUsdcTransferInstruction(
  senderAddress: string,
  recipientAddress: string,
  amountInUsdc: number
): Promise<{
  transaction: Transaction
  senderTokenAccount: string
  recipientTokenAccount: string
}> {
  const connection = getConnection()
  
  const senderPublicKey = new PublicKey(senderAddress)
  const recipientPublicKey = new PublicKey(recipientAddress)
  const usdcMint = new PublicKey(solanaConfig.usdcMint[solanaConfig.network])
  
  // USDC has 6 decimals
  const amount = Math.round(amountInUsdc * 1_000_000)
  
  // For SPL token transfers, we need to use the Token Program
  // This is a simplified version - in production, use @solana/spl-token
  const transaction = new Transaction()
  
  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  transaction.recentBlockhash = blockhash
  transaction.feePayer = senderPublicKey
  transaction.lastValidBlockHeight = lastValidBlockHeight
  
  // Note: Full SPL token transfer requires @solana/spl-token package
  // This would need to be expanded with actual token transfer instructions
  
  return {
    transaction,
    senderTokenAccount: senderAddress, // Would be actual ATA
    recipientTokenAccount: recipientAddress, // Would be actual ATA
  }
}

// =============================================================================
// TRANSACTION VERIFICATION
// =============================================================================

/**
 * Verify a transaction was confirmed
 */
export async function verifyTransaction(
  signature: string
): Promise<SolanaTransactionStatus> {
  try {
    const connection = getConnection()
    const status = await connection.getSignatureStatus(signature)
    
    if (!status.value) {
      return { confirmed: false, error: 'Transaction not found' }
    }
    
    if (status.value.err) {
      return { confirmed: false, error: JSON.stringify(status.value.err) }
    }
    
    // Get transaction details
    const tx = await connection.getTransaction(signature)
    
    return {
      confirmed: true,
      slot: status.value.slot,
      blockTime: tx?.blockTime || undefined,
    }
  } catch (error) {
    console.error('Error verifying transaction:', error)
    return { confirmed: false, error: String(error) }
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  signature: string,
  maxRetries = 30
): Promise<boolean> {
  const connection = getConnection()
  
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature)
    
    if (status.value?.confirmationStatus === 'confirmed' || 
        status.value?.confirmationStatus === 'finalized') {
      return true
    }
    
    if (status.value?.err) {
      console.error('Transaction failed:', status.value.err)
      return false
    }
    
    // Wait 1 second between checks
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return false
}

// =============================================================================
// PAYMENT PROCESSING
// =============================================================================

/**
 * Create a payment request for the frontend
 */
export function createPaymentRequest(
  amountUsd: number,
  currency: 'SOL' | 'USDC' = 'USDC',
  orderId?: string
): SolanaPaymentRequest {
  return {
    amount: amountUsd,
    currency,
    recipientAddress: solanaConfig.recipientWallet,
    metadata: {
      orderId,
      service: 'BaseHealth',
      description: `Payment of $${amountUsd} USD`,
    },
  }
}

/**
 * Process a completed payment (called after wallet signs and sends)
 */
export async function processCompletedPayment(
  signature: string,
  paymentRequest: SolanaPaymentRequest
): Promise<SolanaPaymentResult> {
  try {
    // Verify the transaction
    const isConfirmed = await waitForConfirmation(signature)
    
    if (!isConfirmed) {
      return {
        success: false,
        error: 'Transaction not confirmed',
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        recipientAddress: paymentRequest.recipientAddress || solanaConfig.recipientWallet,
        timestamp: new Date(),
      }
    }
    
    const explorerUrl = getExplorerUrl(signature)
    
    return {
      success: true,
      transactionSignature: signature,
      explorerUrl,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipientAddress: paymentRequest.recipientAddress || solanaConfig.recipientWallet,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return {
      success: false,
      error: String(error),
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      recipientAddress: paymentRequest.recipientAddress || solanaConfig.recipientWallet,
      timestamp: new Date(),
    }
  }
}



export interface SolanaExpectedTransferParams {
  signature: string
  expectedRecipient: string
  expectedAmount: number
  currency: 'SOL' | 'USDC'
  expectedSender?: string
}

/**
 * Verify a transaction includes the expected transfer details.
 */
export async function verifyExpectedTransfer(
  params: SolanaExpectedTransferParams
): Promise<SolanaTransactionStatus> {
  try {
    const connection = getConnection()
    const tx = await connection.getParsedTransaction(params.signature, {
      commitment: solanaConfig.commitment,
      maxSupportedTransactionVersion: 0,
    })

    if (!tx || !tx.meta) {
      return { confirmed: false, error: 'Transaction not found' }
    }

    if (tx.meta.err) {
      return { confirmed: false, error: JSON.stringify(tx.meta.err) }
    }

    const recipient = params.expectedRecipient
    const expectedSender = params.expectedSender
    const expectedAmount = Number(params.expectedAmount)

    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return { confirmed: false, error: 'Invalid expected amount' }
    }

    if (params.currency === 'SOL') {
      const preBalances = tx.meta.preBalances || []
      const postBalances = tx.meta.postBalances || []
      const accountKeys = tx.transaction.message.accountKeys

      const recipientIndex = accountKeys.findIndex((key) => key.pubkey.toBase58() === recipient)
      if (recipientIndex < 0) {
        return { confirmed: false, error: 'Recipient not found in transaction accounts' }
      }

      const lamportDelta = (postBalances[recipientIndex] || 0) - (preBalances[recipientIndex] || 0)
      const receivedSol = lamportDelta / LAMPORTS_PER_SOL
      const amountDiff = Math.abs(receivedSol - expectedAmount)
      if (amountDiff > 0.000001) {
        return { confirmed: false, error: `Amount mismatch: expected ${expectedAmount} SOL, received ${receivedSol} SOL` }
      }

      if (expectedSender) {
        const senderIndex = accountKeys.findIndex((key) => key.pubkey.toBase58() === expectedSender)
        if (senderIndex < 0) {
          return { confirmed: false, error: 'Expected sender not found in transaction accounts' }
        }
      }
    } else {
      const transferInstruction = tx.transaction.message.instructions.find((ix: any) => {
        const parsed = (ix as any).parsed
        if (!parsed || parsed.type !== 'transferChecked') return false
        const info = parsed.info || {}
        return info.mint === solanaConfig.usdcMint[solanaConfig.network]
      }) as any

      if (!transferInstruction?.parsed?.info) {
        return { confirmed: false, error: 'USDC transfer instruction not found' }
      }

      const info = transferInstruction.parsed.info
      const recipientOwner = info.destinationOwner || info.destination
      const senderOwner = info.authority || info.owner

      if (recipientOwner !== recipient && info.destination !== recipient) {
        return { confirmed: false, error: 'USDC recipient mismatch' }
      }

      if (expectedSender && senderOwner !== expectedSender) {
        return { confirmed: false, error: 'USDC sender mismatch' }
      }

      const rawAmount = Number(info.tokenAmount?.amount ?? info.amount ?? 0)
      const decimals = Number(info.tokenAmount?.decimals ?? 6)
      const amount = rawAmount / (10 ** decimals)
      const amountDiff = Math.abs(amount - expectedAmount)
      if (amountDiff > 0.000001) {
        return { confirmed: false, error: `USDC amount mismatch: expected ${expectedAmount}, received ${amount}` }
      }
    }

    return {
      confirmed: true,
      slot: tx.slot,
      blockTime: tx.blockTime || undefined,
    }
  } catch (error) {
    console.error('Error verifying expected transfer:', error)
    return { confirmed: false, error: String(error) }
  }
}

// =============================================================================
// PRICE CONVERSION
// =============================================================================

let solPriceCache: { price: number; timestamp: number } | null = null
const CACHE_DURATION = 60000 // 1 minute

/**
 * Get current SOL price in USD
 */
export async function getSolPrice(): Promise<number> {
  // Check cache
  if (solPriceCache && Date.now() - solPriceCache.timestamp < CACHE_DURATION) {
    return solPriceCache.price
  }
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    )
    const data = await response.json()
    const price = data.solana?.usd || 100 // Fallback price
    
    solPriceCache = { price, timestamp: Date.now() }
    return price
  } catch (error) {
    console.error('Error fetching SOL price:', error)
    return solPriceCache?.price || 100 // Use cached or fallback
  }
}

/**
 * Convert USD to SOL
 */
export async function usdToSol(usdAmount: number): Promise<number> {
  const solPrice = await getSolPrice()
  return usdAmount / solPrice
}

/**
 * Convert SOL to USD
 */
export async function solToUsd(solAmount: number): Promise<number> {
  const solPrice = await getSolPrice()
  return solAmount * solPrice
}

// =============================================================================
// HEALTHCARE-SPECIFIC HELPERS
// =============================================================================

export const solanaHealthcarePayments = {
  consultation: {
    virtual: 75,      // $75 USD
    inPerson: 150,    // $150 USD
    specialist: 250,  // $250 USD
  },
  caregiverBooking: {
    hourly: 35,
    daily: 280,
    weekly: 1680,
  },
  subscription: {
    basic: 9.99,
    premium: 19.99,
    family: 39.99,
  },
}

/**
 * Create a healthcare payment request
 */
export function createHealthcarePayment(
  serviceType: keyof typeof solanaHealthcarePayments,
  tier: string,
  currency: 'SOL' | 'USDC' = 'USDC'
): SolanaPaymentRequest | null {
  const services = solanaHealthcarePayments[serviceType] as Record<string, number>
  const amount = services[tier]
  
  if (!amount) {
    return null
  }
  
  return createPaymentRequest(amount, currency, `${serviceType}-${tier}-${Date.now()}`)
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a Solana wallet address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

/**
 * Check if Solana payments are properly configured
 */
export function isSolanaConfigured(): boolean {
  return !!(
    solanaConfig.recipientWallet &&
    isValidSolanaAddress(solanaConfig.recipientWallet)
  )
}
