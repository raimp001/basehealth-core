import { describe, expect, it } from "vitest"
import { parseBlockscoutTreasuryActivity } from "@/lib/treasury/activity"

const TREASURY = "0xcB335bb4a2d2151F4E17eD525b7874343B77Ba8b"

describe("treasury activity parser", () => {
  it("detects incoming native ETH transfers as possible tips", () => {
    const parsed = parseBlockscoutTreasuryActivity({
      treasuryAddress: TREASURY,
      transactions: {
        items: [
          {
            hash: "0x1e193f011acc98b4f12fd2ae7d9a2e0af79047f365172eee7841de4cf5b3a8e7",
            value: "4613503700000000",
            from: { hash: "0xBefa750Ed568Cc84970eB4FD506aF4FF599c42D0" },
            to: { hash: TREASURY },
            timestamp: "2026-02-02T06:39:47.000000Z",
            status: "ok",
            historic_exchange_rate: "2345.4",
          },
        ],
      },
      tokenTransfers: { items: [] },
    })

    expect(parsed.summary.possibleTipsOrPayments).toBe(1)
    expect(parsed.summary.incomingNativeTransfers).toBe(1)
    expect(parsed.summary.hasUsdcTransfers).toBe(false)
    expect(parsed.events[0]).toMatchObject({
      kind: "native-transfer",
      direction: "incoming",
      asset: "ETH",
      amount: "0.0046135037",
    })
  })

  it("detects incoming USDC token transfers", () => {
    const parsed = parseBlockscoutTreasuryActivity({
      treasuryAddress: TREASURY,
      transactions: { items: [] },
      tokenTransfers: {
        items: [
          {
            transaction_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            from: { hash: "0x1111111111111111111111111111111111111111" },
            to: { hash: TREASURY },
            timestamp: "2026-05-01T00:00:00.000000Z",
            token: { symbol: "USDC", decimals: "6" },
            total: { value: "250000", decimals: "6" },
          },
        ],
      },
    })

    expect(parsed.summary.possibleTipsOrPayments).toBe(1)
    expect(parsed.summary.incomingTokenTransfers).toBe(1)
    expect(parsed.summary.hasUsdcTransfers).toBe(true)
    expect(parsed.events[0]).toMatchObject({
      kind: "token-transfer",
      direction: "incoming",
      asset: "USDC",
      amount: "0.25",
    })
  })
})
