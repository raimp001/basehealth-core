import { describe, it, expect, vi, beforeEach } from 'vitest'

const getTokenMock = vi.fn()
const verifyExpectedTransferMock = vi.fn()
const isValidSolanaAddressMock = vi.fn()

vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
}))

vi.mock('@/lib/admin-access', () => ({
  isAdminEmail: (email?: string) => email === 'admin@basehealth.xyz',
}))

vi.mock('@/lib/solana-payment-service', () => ({
  verifyExpectedTransfer: (...args: unknown[]) => verifyExpectedTransferMock(...args),
  getExplorerUrl: (signature: string) => `https://explorer.solana.com/tx/${signature}`,
  isValidSolanaAddress: (...args: unknown[]) => isValidSolanaAddressMock(...args),
}))

import { POST } from '@/app/api/payments/solana/verify/route'

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/payments/solana/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/payments/solana/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTokenMock.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
    isValidSolanaAddressMock.mockReturnValue(true)
    verifyExpectedTransferMock.mockResolvedValue({ confirmed: true, slot: 1, blockTime: 100 })
  })

  it('rejects anonymous requests', async () => {
    getTokenMock.mockResolvedValueOnce(null)

    const response = await POST(
      makeRequest({
        signature: 'sig',
        expectedRecipient: 'recipientWallet',
        expectedAmount: '1',
        currency: 'SOL',
      }) as any,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ error: 'Authentication required' })
  })

  it('validates currency', async () => {
    const response = await POST(
      makeRequest({
        signature: 'sig',
        expectedRecipient: 'recipientWallet',
        expectedAmount: '1',
        currency: 'BTC',
      }) as any,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: 'currency must be SOL or USDC' })
  })

  it('passes normalized amount to verifier and returns success payload', async () => {
    const response = await POST(
      makeRequest({
        signature: 'sig123',
        orderId: 'order-1',
        expectedRecipient: 'recipientWallet',
        expectedAmount: '10.25',
        currency: 'USDC',
        expectedSender: 'senderWallet',
      }) as any,
    )

    expect(verifyExpectedTransferMock).toHaveBeenCalledWith({
      signature: 'sig123',
      expectedRecipient: 'recipientWallet',
      expectedAmount: 10.25,
      currency: 'USDC',
      expectedSender: 'senderWallet',
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      verified: true,
      status: 'completed',
      signature: 'sig123',
      orderId: 'order-1',
      explorerUrl: 'https://explorer.solana.com/tx/sig123',
    })
  })
})
