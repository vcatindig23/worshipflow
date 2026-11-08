import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TeamInvitation } from "@/components/ui/team-invitation"

const baseProps = {
  email: "member@example.com",
  organizationName: "Unity in Jesus",
  roleLabel: "Team Member",
  createdAt: "2026-11-01T00:00:00.000Z",
  expiresAt: "2099-11-08T00:00:00.000Z",
  actions: null,
}

describe("team invitation status", () => {
  it("shows a pending invitation as sent and awaiting acceptance", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation {...baseProps} status="pending" />
    )

    expect(markup).toContain("Pending")
    expect(markup).toContain("Invitation sent; waiting for the member to accept.")
  })

  it("shows accepted invitations distinctly", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation {...baseProps} status="accepted" />
    )

    expect(markup).toContain("Accepted")
    expect(markup).toContain("This invitation was accepted.")
  })

  it("shows an expired invitation distinctly", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation
        {...baseProps}
        status="expired"
        expiresAt="2020-01-01T00:00:00.000Z"
      />
    )

    expect(markup).toContain("Expired")
    expect(markup).toContain("This invitation has expired.")
  })

  it("shows revoked invitations without offering them as pending", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation {...baseProps} status="revoked" />
    )

    expect(markup).toContain("Revoked")
    expect(markup).toContain("This invitation was revoked")
  })
})
