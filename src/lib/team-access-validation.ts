import { z } from "zod"

export const invitationSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum([
    "worship_leader",
    "song_editor",
    "team_member",
    "viewer",
  ]),
})

export const memberRoleSchema = z.enum([
  "admin",
  "worship_leader",
  "song_editor",
  "team_member",
  "viewer",
])

export const teamPositionSchema = z.enum([
  "worship_leader",
  "singer",
  "lead_guitarist",
  "rhythm_guitarist",
  "acoustic_guitarist",
  "electric_guitarist",
  "bassist",
  "keyboardist",
  "pianist",
  "drummer",
  "percussionist",
  "violinist",
  "cellist",
  "sound_engineer",
  "audio_visual",
  "choir_member",
  "other",
])

export const teamPositionsSchema = z.array(teamPositionSchema).max(10)

export const uuidSchema = z.string().uuid()

export const joinInvitationSchema = z.object({
  code: z.string().trim().toUpperCase().min(8).max(64),
})

/**
 * Check the exact persisted role value. Missing, malformed, or unexpected
 * roles must never receive administrator-only permissions.
 */
export function isAdministrator(role: unknown): boolean {
  return role === "admin"
}

export const setlistEditorRoles = [
  "admin",
  "worship_leader",
  "song_editor",
] as const

export const setlistLeaderRoles = [
  "admin",
  "worship_leader",
] as const

/**
 * Shared allowlist check for server actions. An absent, malformed, or
 * unrecognized role never grants an operation.
 */
export function hasAnyRole(
  role: unknown,
  allowedRoles: readonly string[]
): boolean {
  return typeof role === "string" && allowedRoles.includes(role)
}
