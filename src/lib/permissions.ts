/** Persisted membership roles; worship-team positions and user metadata never grant access. */
export const roles = [
  "admin",
  "worship_leader",
  "song_editor",
  "team_member",
  "viewer",
] as const
export type Role = (typeof roles)[number]
export const editorRoles: readonly string[] = [
  "admin",
  "worship_leader",
  "song_editor",
]
export const leaderRoles: readonly string[] = ["admin", "worship_leader"]
export const administratorRoles: readonly string[] = ["admin"]

// Preserve existing participation rights; viewers cannot edit the shared catalog or service plans.
export const permissionRoles = {
  "workspace:read": roles,
  "preferences:self": roles,
  "chat:participate": roles,
  "chat:pin": leaderRoles,
  "review:participate": roles,
  "review:moderate": editorRoles,
  "songs:edit": editorRoles,
  "services:edit": editorRoles,
  "services:lead": leaderRoles,
  "files:manage": editorRoles,
  "templates:manage": editorRoles,
  "team:manage": administratorRoles,
  "organization:manage": administratorRoles,
  "audit:read": administratorRoles,
} as const
export type Permission = keyof typeof permissionRoles
export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (roles as readonly string[]).includes(value)
  )
}
export function hasPermission(role: unknown, permission: Permission): boolean {
  return (
    isRole(role) &&
    (permissionRoles[permission] as readonly string[]).includes(role)
  )
}
