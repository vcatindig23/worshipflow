import { NextRequest, NextResponse } from "next/server"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { isEmailConfirmation } from "@/lib/email-confirmation"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")

  if (code && !tokenHash) {
    const callback = new URL("/auth/callback", origin)
    callback.searchParams.set("code", code)
    callback.searchParams.set(
      "next",
      getSafeAuthNextPath(searchParams.get("next"))
    )
    return NextResponse.redirect(callback, 303)
  }

  if (isEmailConfirmation(tokenHash, type)) {
    // A GET must not sign a browser into an account. Require an intentional,
    // same-origin form submission, and let email link scanners leave tokens intact.
    const verify = new URL("/auth/verify", origin)
    verify.searchParams.set("token_hash", tokenHash)
    verify.searchParams.set("type", type!)
    verify.searchParams.set("next", type === "recovery" ? "/reset-password" : getSafeAuthNextPath(searchParams.get("next")))
    return NextResponse.redirect(verify, 303)
  }
  return NextResponse.redirect(
    new URL("/error?code=confirmation_failed", origin),
    303
  )
}
