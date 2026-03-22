import { describe, expect, it } from "vitest"
import { createBillingReceipt, createTransactionReceipt } from "@/lib/base-billing"

describe("base billing receipts", () => {
  it("uses payment metadata to label booking receipts", () => {
    const receipt = createBillingReceipt({
      id: "booking_123",
      amount: 0.25,
      currency: "USDC",
      status: "CONFIRMED",
      paymentStatus: "PAID",
      paymentProvider: "BASE_USDC",
      paymentProviderId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      paymentMetadata: {
        network: "Base Mainnet",
        payment: {
          txHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
          serviceType: "assistant-pass-chat",
          serviceDescription: "24h access to BaseHealth Assistant",
        },
      },
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      paidAt: new Date("2026-03-22T00:01:00.000Z"),
      user: {
        name: "Patient Zero",
        email: "patient@example.com",
      },
      caregiver: {
        firstName: "Base",
        lastName: "Health",
      },
    })

    expect(receipt.source).toBe("booking")
    expect(receipt.description).toBe("24h access to BaseHealth Assistant")
    expect(receipt.serviceType).toBe("assistant-pass-chat")
    expect(receipt.paymentExplorerUrl).toContain("basescan.org/tx/")
  })

  it("creates standalone transaction receipts for assistant passes and other non-booking payments", () => {
    const receipt = createTransactionReceipt({
      id: "txn_123",
      bookingId: null,
      transactionHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      provider: "BASE_USDC",
      providerId: "pay_123",
      amount: 1.5,
      currency: "USDC",
      status: "PAID",
      metadata: {
        orderId: "assistant-pass-chat-123",
        sender: "0x3333333333333333333333333333333333333333",
        network: "Base Mainnet",
        serviceType: "assistant-pass-chat",
        serviceDescription: "24h access to BaseHealth Assistant",
        patientEmail: "wallet@example.com",
      },
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      completedAt: new Date("2026-03-22T00:02:00.000Z"),
    })

    expect(receipt.source).toBe("transaction")
    expect(receipt.bookingId).toBe("assistant-pass-chat-123")
    expect(receipt.description).toBe("24h access to BaseHealth Assistant")
    expect(receipt.patientEmail).toBe("wallet@example.com")
    expect(receipt.paymentExplorerUrl).toContain("basescan.org/tx/")
  })
})
