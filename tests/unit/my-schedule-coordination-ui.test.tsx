import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("../../src/app/my-schedule/actions", () => ({
  respondToSetlistAssignment: vi.fn(async () => ({
    success: true,
    status: "confirmed",
    error: "",
  })),
}))

import AssignmentConfirmation from "@/app/my-schedule/assignment-confirmation"
import { TeamInvitation } from "@/components/ui/team-invitation"

describe("My Schedule confirmation feedback", () => {
  it("identifies the exact position awaiting a response", () => {
    const markup = renderToStaticMarkup(
      <AssignmentConfirmation
        assignmentId="11111111-1111-4111-8111-111111111111"
        status="pending"
        responseNote={null}
        respondedAt={null}
        timeZone="Asia/Manila"
        positionLabel="Drummer"
      />
    )

    expect(markup).toContain("Drummer · Pending confirmation")
    expect(markup).toContain("Your response has not been saved yet.")
    expect(markup).toContain("Confirm")
    expect(markup).toContain("Decline")
  })

  it("explains what a saved confirmation means", () => {
    const markup = renderToStaticMarkup(
      <AssignmentConfirmation
        assignmentId="11111111-1111-4111-8111-111111111111"
        status="confirmed"
        responseNote={null}
        respondedAt="2026-11-05T08:00:00.000Z"
        timeZone="Asia/Manila"
        positionLabel="Keyboardist"
      />
    )

    expect(markup).toContain("Keyboardist · Confirmed")
    expect(markup).toContain("Your worship leader can see that you are available to serve.")
  })
})

describe("team invitation lifecycle", () => {
  const base = {
    email: "member@example.com",
    organizationName: "Unity in Jesus",
    roleLabel: "Team Member",
    createdAt: "2026-11-01T08:00:00.000Z",
    expiresAt: "2026-11-08T08:00:00.000Z",
  }

  it("labels an active invitation as invited and awaiting acceptance", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation {...base} status="pending" />
    )

    expect(markup).toContain("Invited")
    expect(markup).toContain("Waiting for the invitee to accept the invitation.")
  })

  it("shows accepted invitations distinctly", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation {...base} status="accepted" />
    )

    expect(markup).toContain("Accepted")
    expect(markup).toContain("The invited person has joined the church workspace.")
  })

  it("marks a pending invitation expired when its seven-day window has elapsed", () => {
    const markup = renderToStaticMarkup(
      <TeamInvitation
        {...base}
        status="pending"
        expiresAt="2020-01-01T00:00:00.000Z"
      />
    )

    expect(markup).toContain("Expired")
    expect(markup).toContain("The seven-day invitation window has ended.")
  })

  it("explains revoked and failed invitation states", () => {
    const revoked = renderToStaticMarkup(
      <TeamInvitation {...base} status="revoked" />
    )
    const failed = renderToStaticMarkup(
      <TeamInvitation {...base} status="failed" />
    )

    expect(revoked).toContain("Revoked")
    expect(failed).toContain("Failed")
    expect(failed).toContain("The invitation was not created.")
  })
})
