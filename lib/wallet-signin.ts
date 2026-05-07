import "server-only"

import { ACTIVE_CHAIN } from "@/lib/network-config"
import {
  createPublicClient,
  hashMessage,
  http,
  isAddress,
  isHex,
  stringToHex,
  verifyMessage,
  type Hex,
} from "viem"
import { base, baseSepolia } from "viem/chains"

export type WalletSignatureVerificationResult = {
  valid: boolean
  isContractWallet: boolean
  error?: string
}

let cachedClient: any = null

function getPublicClient(): any {
  if (cachedClient) return cachedClient

  const chain = ACTIVE_CHAIN.id === base.id ? base : baseSepolia
  cachedClient = createPublicClient({
    chain,
    transport: http((ACTIVE_CHAIN as any).rpcUrls?.default ?? undefined),
  })

  return cachedClient
}

const EIP1271_MAGIC_VALUE = "0x1626ba7e"

const EIP1271_ABI_BYTES32 = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const

const EIP1271_ABI_BYTES = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "data", type: "bytes" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const

async function isContractAddress(address: Hex): Promise<boolean> {
  const client = getPublicClient()
  const bytecode = await client.getBytecode({ address })
  return Boolean(bytecode && bytecode !== "0x")
}

async function verifyEip1271Signature(address: Hex, message: string, signature: Hex): Promise<boolean> {
  const client = getPublicClient()
  const messageHash = hashMessage(message)

  try {
    const magicValue = await client.readContract({
      address,
      abi: EIP1271_ABI_BYTES32,
      functionName: "isValidSignature",
      args: [messageHash, signature],
    })

    if (typeof magicValue === "string" && magicValue.toLowerCase() === EIP1271_MAGIC_VALUE) {
      return true
    }
  } catch {
    // Some contract wallets only implement the `bytes` overload.
  }

  try {
    const magicValue = await client.readContract({
      address,
      abi: EIP1271_ABI_BYTES,
      functionName: "isValidSignature",
      args: [stringToHex(message), signature],
    })

    return typeof magicValue === "string" && magicValue.toLowerCase() === EIP1271_MAGIC_VALUE
  } catch {
    return false
  }
}

export async function verifyWalletMessageSignature(params: {
  address: string
  message: string
  signature: string
}): Promise<WalletSignatureVerificationResult> {
  const normalizedAddress = params.address.toLowerCase()

  if (!isAddress(normalizedAddress)) {
    return { valid: false, isContractWallet: false, error: "Invalid address" }
  }
  if (!isHex(params.signature)) {
    return { valid: false, isContractWallet: false, error: "Invalid signature" }
  }

  const address = normalizedAddress as Hex
  const signature = params.signature as Hex

  try {
    const contractWallet = await isContractAddress(address)
    if (contractWallet) {
      const valid = await verifyEip1271Signature(address, params.message, signature)
      return { valid, isContractWallet: true, error: valid ? undefined : "Invalid contract signature" }
    }

    const valid = await verifyMessage({
      address,
      message: params.message,
      signature,
    })

    return { valid, isContractWallet: false, error: valid ? undefined : "Invalid signature" }
  } catch (error) {
    return {
      valid: false,
      isContractWallet: false,
      error: error instanceof Error ? error.message : "Signature verification failed",
    }
  }
}
