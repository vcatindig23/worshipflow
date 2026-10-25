import type { EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"

const emailTypes: EmailOtpType[] = [
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
]

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

  if (
    tokenHash &&
    tokenHash.length <= 2048 &&
    emailTypes.includes(type as EmailOtpType)
  ) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (!error) {
      const next =
        type === "recovery"
          ? "/reset-password"
          : getSafeAuthNextPath(searchParams.get("next"))
      return NextResponse.redirect(new URL(next, origin), 303)
    }
  }
  return NextResponse.redirect(
    new URL("/error?code=confirmation_failed", origin),
    303
  )
}
