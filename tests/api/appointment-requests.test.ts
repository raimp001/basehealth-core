import { describe, expect, it } from "vitest"
import { POST, GET } from "@/app/api/appointment-requests/route"

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/appointment-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/appointment-requests", () => {
  it("accepts a valid visit request with 202", async () => {
    const res = await POST(
      buildRequest({
        id: "appt_test_abc123",
        providerName: "BaseHealth network",
        providerKind: "primary-care",
        reason: "Annual physical",
        urgency: "routine",
        contactEmail: "patient@example.com",
        createdAt: Date.now(),
      }),
    )
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.requestId).toBe("appt_test_abc123")
    expect(json.status).toBe("received")
  })

  it("returns urgent next-step language for urgent requests", async () => {
    const res = await POST(
      buildRequest({
        id: "appt_urgent_xyz789",
        providerName: "Cardiology",
        providerKind: "specialty",
        reason: "Chest pain follow-up",
        urgency: "urgent",
        contactEmail: "patient@example.com",
      }),
    )
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.nextStep).toMatch(/emergency/i)
  })

  it("rejects malformed payloads with 400", async () => {
    const res = await POST(
      buildRequest({
        id: "x", // too short
        providerName: "",
        providerKind: "",
        reason: "",
        urgency: "whenever",
        contactEmail: "not-an-email",
      }),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
  })
})

describe("GET /api/appointment-requests", () => {
  it("returns informational metadata", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(typeof json.info).toBe("string")
  })
})
