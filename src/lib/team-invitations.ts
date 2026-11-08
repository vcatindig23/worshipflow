export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked"

/**
 * Resolve the current invitation lifecycle state.
 *
 * The optional clock argument keeps this helper deterministic in tests.
 * Database status remains authoritative except that a pending invitation
 * is displayed as expired once its expiry timestamp has passed.
 */
export function getInvitationStatus(
  status: InvitationStatus,
  expiresAt: string,
  now = Date.now()
): InvitationStatus {
  if (status !== "pending") return status

  const expiry = Date.parse(expiresAt)
  return Number.isFinite(expiry) && expiry <= now
    ? "expired"
    : "pending"
}
