import { describe, expect, it } from "vitest"
import {
  invitationSchema,
  isAdministrator,
  joinInvitationSchema,
  memberRoleSchema,
  teamPositionSchema,
  teamPositionsSchema,
  uuidSchema,
  hasAnyRole,
  setlistEditorRoles,
  setlistLeaderRoles,
} from "../../src/lib/team-access-validation"

describe("team invitation input validation", () => {
  it("trims valid email addresses and permits only invitation roles", () => {
    expect(
      invitationSchema.safeParse({
        email: "  member@example.com  ",
        role: "team_member",
      })
    ).toMatchObject({
      success: true,
      data: {
        email: "member@example.com",
        role: "team_member",
      },
    })

    for (const role of [
      "worship_leader",
      "song_editor",
      "team_member",
      "viewer",
    ]) {
      expect(
        invitationSchema.safeParse({
          email: "member@example.com",
          role,
        }).success
      ).toBe(true)
    }
  })

  it("rejects malformed emails and prevents admin from being granted by invitation", () => {
    expect(
      invitationSchema.safeParse({
        email: "not-an-email",
        role: "team_member",
      }).success
    ).toBe(false)

    expect(
      invitationSchema.safeParse({
        email: "member@example.com",
        role: "admin",
      }).success
    ).toBe(false)

    expect(
      invitationSchema.safeParse({
        email: "member@example.com",
        role: "owner",
      }).success
    ).toBe(false)
  })

  it("accepts only the defined persisted member roles", () => {
    for (const role of [
      "admin",
      "worship_leader",
      "song_editor",
      "team_member",
      "viewer",
    ]) {
      expect(memberRoleSchema.safeParse(role).success).toBe(true)
    }

    expect(memberRoleSchema.safeParse("owner").success).toBe(false)
    expect(memberRoleSchema.safeParse(null).success).toBe(false)
  })
})

describe("administrator authorization predicate", () => {
  it("grants administrative capability only to the exact admin role", () => {
    expect(isAdministrator("admin")).toBe(true)

    for (const role of [
      "worship_leader",
      "song_editor",
      "team_member",
      "viewer",
      "ADMIN",
      "",
      null,
      undefined,
      { role: "admin" },
    ]) {
      expect(isAdministrator(role)).toBe(false)
    }
  })
})

describe("team position validation", () => {
  it("accepts supported worship and production positions", () => {
    for (const position of [
      "worship_leader",
      "singer",
      "drummer",
      "sound_engineer",
      "audio_visual",
      "other",
    ]) {
      expect(teamPositionSchema.safeParse(position).success).toBe(true)
    }
  })

  it("rejects unknown positions and more than ten positions", () => {
    expect(teamPositionSchema.safeParse("administrator").success).toBe(false)
    expect(
      teamPositionsSchema.safeParse(["drummer", "sound_engineer"]).success
    ).toBe(true)
    expect(
      teamPositionsSchema.safeParse(Array.from({ length: 11 }, () => "drummer"))
        .success
    ).toBe(false)
  })
})

describe("invitation join code validation", () => {
  it("trims and normalizes submitted codes before they are hashed", () => {
    expect(
      joinInvitationSchema.safeParse({ code: "  abcd2345  " })
    ).toMatchObject({
      success: true,
      data: { code: "ABCD2345" },
    })
  })

  it("rejects missing, short, and excessively long codes", () => {
    expect(joinInvitationSchema.safeParse({ code: "" }).success).toBe(false)
    expect(joinInvitationSchema.safeParse({ code: "short" }).success).toBe(false)
    expect(
      joinInvitationSchema.safeParse({ code: "A".repeat(65) }).success
    ).toBe(false)
    expect(joinInvitationSchema.safeParse({ code: null }).success).toBe(false)
  })
})

describe("identifier validation", () => {
  it("accepts UUIDs and rejects arbitrary identifiers", () => {
    expect(
      uuidSchema.safeParse("f1d2d2f9-2a9d-4f8e-a6c0-2c5ce44f3a10").success
    ).toBe(true)
    expect(uuidSchema.safeParse("../../admin").success).toBe(false)
    expect(uuidSchema.safeParse("").success).toBe(false)
  })
})

describe("setlist access role matrix", () => {
  it("allows only editors to change setlist content and assignments", () => {
    for (const role of ["admin", "worship_leader", "song_editor"]) {
      expect(hasAnyRole(role, setlistEditorRoles)).toBe(true)
    }

    for (const role of ["team_member", "viewer", "", null, undefined, "Admin"]) {
      expect(hasAnyRole(role, setlistEditorRoles)).toBe(false)
    }
  })

  it("limits setlist lifecycle actions to administrators and worship leaders", () => {
    expect(hasAnyRole("admin", setlistLeaderRoles)).toBe(true)
    expect(hasAnyRole("worship_leader", setlistLeaderRoles)).toBe(true)
    expect(hasAnyRole("song_editor", setlistLeaderRoles)).toBe(false)
    expect(hasAnyRole("team_member", setlistLeaderRoles)).toBe(false)
    expect(hasAnyRole("viewer", setlistLeaderRoles)).toBe(false)
  })

  it("does not grant access for malformed role types", () => {
    expect(hasAnyRole({ role: "admin" }, setlistEditorRoles)).toBe(false)
    expect(hasAnyRole(["admin"], setlistLeaderRoles)).toBe(false)
    expect(hasAnyRole(0, setlistEditorRoles)).toBe(false)
  })
})
