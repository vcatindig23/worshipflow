import "server-only"

import {
  createHash,
  randomBytes,
} from "node:crypto"

const alphabet =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateInviteCode() {
  const bytes =
    randomBytes(12)

  return Array.from(
    bytes,
    (byte) =>
      alphabet[
        byte % alphabet.length
      ]
  ).join("")
}

export function hashInviteCode(
  code: string
) {
  return createHash("sha256")
    .update(
      code.trim().toUpperCase()
    )
    .digest("hex")
}