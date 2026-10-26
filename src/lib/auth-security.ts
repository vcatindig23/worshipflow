import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30
export const RECOVERY_COOKIE = "wf-recovery"

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  }
}

/** Reject cross-site and missing-Origin mutations, including ordinary HTML forms. */
export function isSameOriginRequest(headers: Headers, requestUrl?: string) {
  const origin = headers.get("origin")
  const host = headers.get("x-forwarded-host") ?? headers.get("host")
  if (!origin || origin === "null") return false
  try {
    const parsed = new URL(origin)
    const expected = requestUrl ? new URL(requestUrl).host : host
    if (!["https:", "http:"].includes(parsed.protocol) || headers.get("sec-fetch-site") === "cross-site") return false
    if (parsed.host === expected && (!requestUrl || parsed.origin === new URL(requestUrl).origin)) return true
    // Local reverse proxies (including Codespaces) can report an internal URL.
    // Trust only the explicitly configured development origin, never a wildcard.
    return process.env.NODE_ENV === "development" && !!process.env.NEXT_PUBLIC_SITE_URL &&
      parsed.origin === new URL(process.env.NEXT_PUBLIC_SITE_URL).origin &&
      headers.get("x-forwarded-host") === parsed.host
  } catch { return false }
}

export function getAuthSiteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "")
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Invalid authentication site URL")
  }
  return url.origin
}

function recoverySignature(payload: string) {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Server authentication key is unavailable")
  return createHmac("sha256", secret).update("worshipflow-recovery:" + payload).digest("base64url")
}

export function createRecoveryProof(userId: string, sessionId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, sessionId, expires: now + 10 * 60_000 })).toString("base64url")
  return payload + "." + recoverySignature(payload)
}

export function verifyRecoveryProof(proof: string | undefined, userId: string, sessionId: string, now = Date.now()) {
  if (!proof || proof.length > 2048) return false
  try {
    const [payload, signature, extra] = proof.split(".")
    if (!payload || !signature || extra) return false
    const expected = Buffer.from(recoverySignature(payload))
    const actual = Buffer.from(signature)
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    return data.userId === userId && data.sessionId === sessionId && Number.isFinite(data.expires) && data.expires > now
  } catch { return false }
}
