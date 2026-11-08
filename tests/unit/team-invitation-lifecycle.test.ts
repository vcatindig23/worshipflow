import { describe, expect, it } from "vitest"
import { getInvitationStatus } from "@/lib/team-invitations"

describe("team invitation lifecycle", () => {
  const now = Date.parse("2026-11-08T09:00:00.000Z")

  it("keeps pending invitations active before their expiry time", () => {
    expect(
      getInvitationStatus("pending", "2026-11-08T09:01:00.000Z", now)
    ).toBe("pending")
  })

  it("marks pending invitations expired at or after their expiry time", () => {
    expect(
      getInvitationStatus("pending", "2026-11-08T09:00:00.000Z", now)
    ).toBe("expired")
    expect(
      getInvitationStatus("pending", "2026-11-07T09:00:00.000Z", now)
    ).toBe("expired")
  })

  it("preserves accepted and revoked database states", () => {
    expect(
      getInvitationStatus("accepted", "2020-01-01T00:00:00.000Z", now)
    ).toBe("accepted")
    expect(
      getInvitationStatus("revoked", "2020-01-01T00:00:00.000Z", now)
    ).toBe("revoked")
  })

  it("does not expire an invitation with an invalid expiry timestamp", () => {
    expect(getInvitationStatus("pending", "invalid", now)).toBe("pending")
  })
})
