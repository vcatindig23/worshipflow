import { cookies } from "next/headers"
import { createRecoveryProof, RECOVERY_COOKIE, sessionCookieOptions, verifyRecoveryProof } from "./auth-security"
import type { createClient } from "./supabase/server"

export async function grantRecoverySession(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub || typeof claims.session_id !== "string") return false
  ;(await cookies()).set(RECOVERY_COOKIE, createRecoveryProof(claims.sub, claims.session_id), { ...sessionCookieOptions(), maxAge: 600 })
  return true
}

export async function hasRecoverySession(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  return !error && !!claims?.sub && typeof claims.session_id === "string" &&
    verifyRecoveryProof((await cookies()).get(RECOVERY_COOKIE)?.value, claims.sub, claims.session_id)
}
