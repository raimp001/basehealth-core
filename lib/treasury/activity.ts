import { formatUnits, isAddress } from "viem"
import { ACTIVE_CHAIN, PAYMENT_CONFIG } from "@/lib/network-config"

export type TreasuryActivityEvent = {
  id: string
  kind: "native-transfer" | "token-transfer"
  direction: "incoming" | "outgoing" | "self" | "unknown"
  asset: string
  amount: string
  amountUsd: string | null
  from: string | null
  to: string | null
  txHash: string
  timestamp: string | null
  status: string | null
  method: string | null
  explorerUrl: string
}

export type TreasuryActivitySummary = {
  eventCount: number
  incomingNativeTransfers: number
  incomingTokenTransfers: number
  possibleTipsOrPayments: number
  hasUsdcTransfers: boolean
  latestIncomingAt: string | null
}

export type TreasuryActivityResponse = {
  success: boolean
  generatedAt: string
  network: {
    name: string
    chainId: number
    explorer: string
    activityExplorer: string
  }
  treasuryAddress: string
  events: TreasuryActivityEvent[]
  summary: TreasuryActivitySummary
  error?: string
  help?: string
}

type BlockscoutListResponse = {
  items?: any[]
  next_page_params?: unknown
}

export function getBlockscoutBaseUrl(chainId = ACTIVE_CHAIN.id): string {
  return chainId === 84532 ? "https://base-sepolia.blockscout.com" : "https://base.blockscout.com"
}

function normalizeAddress(value: unknown): string | null {
  const hash = typeof value === "string" ? value : typeof value === "object" && value ? (value as any).hash : null
  if (!hash || typeof hash !== "string") return null
  return hash
}

function getDirection(from: string | null, to: string | null, treasuryAddress: string): TreasuryActivityEvent["direction"] {
  const treasury = treasuryAddress.toLowerCase()
  const fromMatch = from?.toLowerCase() === treasury
  const toMatch = to?.toLowerCase() === treasury
  if (fromMatch && toMatch) return "self"
  if (toMatch) return "incoming"
  if (fromMatch) return "outgoing"
  return "unknown"
}

function formatRawAmount(rawValue: unknown, decimals: number): string {
  try {
    const raw = typeof rawValue === "bigint" ? rawValue : BigInt(String(rawValue || "0"))
    return formatUnits(raw, decimals)
  } catch {
    return "0"
  }
}

function txExplorerUrl(txHash: string): string {
  return `${ACTIVE_CHAIN.blockExplorers.default}/tx/${txHash}`
}

export function parseBlockscoutTreasuryActivity(input: {
  treasuryAddress: string
  transactions?: BlockscoutListResponse
  tokenTransfers?: BlockscoutListResponse
}): { events: TreasuryActivityEvent[]; summary: TreasuryActivitySummary } {
  const nativeEvents: TreasuryActivityEvent[] = (input.transactions?.items || [])
    .filter((tx) => tx?.hash && String(tx.value || "0") !== "0")
    .map((tx) => {
      const from = normalizeAddress(tx.from)
      const to = normalizeAddress(tx.to)
      const txHash = String(tx.hash)
      return {
        id: `native-${txHash}`,
        kind: "native-transfer",
        direction: getDirection(from, to, input.treasuryAddress),
        asset: "ETH",
        amount: formatRawAmount(tx.value, 18),
        amountUsd: tx.historic_exchange_rate
          ? (Number(formatRawAmount(tx.value, 18)) * Number(tx.historic_exchange_rate)).toFixed(2)
          : null,
        from,
        to,
        txHash,
        timestamp: tx.timestamp || null,
        status: tx.status || tx.result || null,
        method: tx.method || null,
        explorerUrl: txExplorerUrl(txHash),
      }
    })

  const tokenEvents: TreasuryActivityEvent[] = (input.tokenTransfers?.items || []).map((transfer) => {
    const from = normalizeAddress(transfer.from)
    const to = normalizeAddress(transfer.to)
    const txHash = String(transfer.transaction_hash || transfer.transaction?.hash || transfer.tx_hash || "")
    const token = transfer.token || {}
    const total = transfer.total || {}
    const decimals = Number.parseInt(String(total.decimals ?? token.decimals ?? "18"), 10)
    const symbol = String(token.symbol || token.name || "TOKEN")
    return {
      id: `token-${txHash}-${transfer.log_index ?? transfer.index ?? symbol}`,
      kind: "token-transfer",
      direction: getDirection(from, to, input.treasuryAddress),
      asset: symbol,
      amount: formatRawAmount(total.value ?? transfer.value, Number.isFinite(decimals) ? decimals : 18),
      amountUsd: null,
      from,
      to,
      txHash,
      timestamp: transfer.timestamp || transfer.transaction?.timestamp || null,
      status: null,
      method: transfer.method || null,
      explorerUrl: txHash ? txExplorerUrl(txHash) : `${ACTIVE_CHAIN.blockExplorers.default}/address/${input.treasuryAddress}`,
    }
  })

  const events = [...nativeEvents, ...tokenEvents]
    .filter((event) => event.direction !== "unknown")
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return bTime - aTime
    })

  const incomingEvents = events.filter((event) => event.direction === "incoming" || event.direction === "self")
  const summary: TreasuryActivitySummary = {
    eventCount: events.length,
    incomingNativeTransfers: incomingEvents.filter((event) => event.kind === "native-transfer").length,
    incomingTokenTransfers: incomingEvents.filter((event) => event.kind === "token-transfer").length,
    possibleTipsOrPayments: incomingEvents.length,
    hasUsdcTransfers: incomingEvents.some((event) => event.asset.toUpperCase() === "USDC"),
    latestIncomingAt: incomingEvents[0]?.timestamp || null,
  }

  return { events, summary }
}

async function fetchBlockscoutList(path: string): Promise<BlockscoutListResponse> {
  const response = await fetch(`${getBlockscoutBaseUrl()}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`Blockscout request failed (${response.status})`)
  }
  return (await response.json()) as BlockscoutListResponse
}

export async function getTreasuryActivity(limit = 20): Promise<TreasuryActivityResponse> {
  const treasuryAddress = PAYMENT_CONFIG.recipientAddress
  if (!treasuryAddress || !isAddress(treasuryAddress)) {
    return {
      success: false,
      generatedAt: new Date().toISOString(),
      network: {
        name: ACTIVE_CHAIN.name,
        chainId: ACTIVE_CHAIN.id,
        explorer: ACTIVE_CHAIN.blockExplorers.default,
        activityExplorer: getBlockscoutBaseUrl(),
      },
      treasuryAddress: treasuryAddress || "",
      events: [],
      summary: {
        eventCount: 0,
        incomingNativeTransfers: 0,
        incomingTokenTransfers: 0,
        possibleTipsOrPayments: 0,
        hasUsdcTransfers: false,
        latestIncomingAt: null,
      },
      error: "Treasury address is not configured",
      help: "Set NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS to a valid 0x address.",
    }
  }

  const encodedAddress = encodeURIComponent(treasuryAddress)
  const [transactions, tokenTransfers] = await Promise.all([
    fetchBlockscoutList(`/api/v2/addresses/${encodedAddress}/transactions`),
    fetchBlockscoutList(`/api/v2/addresses/${encodedAddress}/token-transfers`),
  ])
  const parsed = parseBlockscoutTreasuryActivity({ treasuryAddress, transactions, tokenTransfers })

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    network: {
      name: ACTIVE_CHAIN.name,
      chainId: ACTIVE_CHAIN.id,
      explorer: ACTIVE_CHAIN.blockExplorers.default,
      activityExplorer: getBlockscoutBaseUrl(),
    },
    treasuryAddress,
    events: parsed.events.slice(0, limit),
    summary: parsed.summary,
  }
}
