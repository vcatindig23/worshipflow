import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

export type AuthOperation = "login" | "signup" | "recovery" | "sensitive" | "mfa"

/** Fixed-window counters live in Postgres, shared by every app instance. Fail closed. */
export async function allowAuthAttempt(operation: AuthOperation, identity: string) {
  try {
    const requestHeaders = await headers()
    // Vercel replaces this header. Never trust arbitrary forwarded IPs in production.
    const ip = process.env.VERCEL === "1"
      ? requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
      : process.env.NODE_ENV === "development"
        ? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
        : "unknown"
    const digest = (value: string) => createHash("sha256").update(value).digest("hex")
    const admin = createAdminClient()
    const { data, error } = await admin.rpc("consume_auth_attempt", {
      p_operation: operation,
      p_identity: digest(identity.trim().toLowerCase()),
      p_ip: digest(ip),
    })
    return !error && data === true
  } catch { return false }
}
