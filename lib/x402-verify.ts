import "server-only"

import { createPublicClient, decodeEventLog, http, isAddress, type Hex } from "viem"
import { base, baseSepolia } from "viem/chains"
import { type ExactSchemePayload, type PaymentRequirement, type VerificationResponse } from "@/lib/x402-protocol"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const ERC20_TRANSFER_EVENT_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    anonymous: false,
  },
] as const

// Avoid leaking viem's chain generics into the rest of the codebase.
const CLIENTS: Record<string, any> = {}

function getClient(network: string): any {
  if (CLIENTS[network]) return CLIENTS[network]!

  if (network === "base") {
    CLIENTS[network] = createPublicClient({
      chain: base,
      transport: http("https://mainnet.base.org"),
    })
    return CLIENTS[network]!
  }

  // default to base-sepolia
  CLIENTS[network] = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  })
  return CLIENTS[network]!
}

function isValidTxHash(txHash: string): txHash is Hex {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash)
}

function isRecentEnough(blockTimestampSeconds: bigint, maxTimeoutSeconds: number): boolean {
  if (!Number.isFinite(maxTimeoutSeconds) || maxTimeoutSeconds <= 0) return true
  const nowSeconds = Math.floor(Date.now() / 1000)
  const blockSeconds = Number(blockTimestampSeconds)
  if (!Number.isFinite(blockSeconds)) return false
  return nowSeconds - blockSeconds <= maxTimeoutSeconds
}

export async function verifyExactPayment(
  payload: ExactSchemePayload,
  requirement: PaymentRequirement
): Promise<VerificationResponse> {
  try {
    // Basic validation
    if (!payload?.txHash || !isValidTxHash(payload.txHash)) {
      return { isValid: false, invalidReason: "Invalid transaction hash format" }
    }
    if (!isAddress(payload.from)) {
      return { isValid: false, invalidReason: "Invalid sender address" }
    }
    if (!isAddress(payload.to)) {
      return { isValid: false, invalidReason: "Invalid recipient address" }
    }
    if (!isAddress(requirement.payTo)) {
      return { isValid: false, invalidReason: "Invalid payTo address" }
    }
    if (!payload.to || payload.to.toLowerCase() !== requirement.payTo.toLowerCase()) {
      return { isValid: false, invalidReason: `Recipient mismatch: ${payload.to} !== ${requirement.payTo}` }
    }

    const paidAmount = BigInt(payload.amount)
    const requiredAmount = BigInt(requirement.maxAmountRequired)
    if (paidAmount < requiredAmount) {
      return {
        isValid: false,
        invalidReason: `Insufficient payment: ${paidAmount.toString()} < ${requiredAmount.toString()}`,
      }
    }

    const client = getClient(requirement.network)
    const receipt = await client.getTransactionReceipt({ hash: payload.txHash })
    if (receipt.status !== "success") {
      return { isValid: false, invalidReason: "Transaction failed or not confirmed" }
    }

    const block = await client.getBlock({ blockNumber: receipt.blockNumber })
    if (!isRecentEnough(block.timestamp, requirement.maxTimeoutSeconds)) {
      return { isValid: false, invalidReason: "Payment timed out (too old)" }
    }

    // Native asset case (ETH)
    if (!requirement.asset || requirement.asset.toLowerCase() === ZERO_ADDRESS) {
      const tx = await client.getTransaction({ hash: payload.txHash })
      if (!tx.to || tx.to.toLowerCase() !== requirement.payTo.toLowerCase()) {
        return { isValid: false, invalidReason: "ETH recipient mismatch" }
      }
      if (tx.from.toLowerCase() !== payload.from.toLowerCase()) {
        return { isValid: false, invalidReason: "ETH sender mismatch" }
      }
      if (tx.value < requiredAmount) {
        return { isValid: false, invalidReason: "Insufficient ETH value" }
      }
      return { isValid: true, invalidReason: null }
    }

    // ERC20 case (USDC, etc): verify transfer event emitted by the asset contract.
    if (!isAddress(requirement.asset)) {
      return { isValid: false, invalidReason: "Invalid asset address" }
    }

    const assetAddress = requirement.asset.toLowerCase()
    const matches = receipt.logs.filter((log: any) => log.address.toLowerCase() === assetAddress)

    for (const log of matches) {
      try {
        const decoded = decodeEventLog({
          abi: ERC20_TRANSFER_EVENT_ABI,
          data: log.data,
          topics: log.topics,
        })

        if (decoded.eventName !== "Transfer") continue

        const from = String((decoded.args as any).from || "").toLowerCase()
        const to = String((decoded.args as any).to || "").toLowerCase()
        const value = BigInt((decoded.args as any).value ?? BigInt(0))

        if (to !== requirement.payTo.toLowerCase()) continue
        if (from !== payload.from.toLowerCase()) continue
        if (value < requiredAmount) continue

        return { isValid: true, invalidReason: null }
      } catch {
        // Ignore logs that don't match this ABI (or decode fails).
      }
    }

    return { isValid: false, invalidReason: "No matching ERC20 transfer found in transaction logs" }
  } catch (error) {
    return {
      isValid: false,
      invalidReason: error instanceof Error ? error.message : "Verification failed",
    }
  }
}
