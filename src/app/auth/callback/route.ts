import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { grantRecoverySession } from "@/lib/auth-recovery"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = getSafeAuthNextPath(searchParams.get("next"))
  const providerError =
    searchParams.get("error") ?? searchParams.get("error_description")

  if (!code || code.length > 2048 || providerError) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  if (!(await allowAuthAttempt("mfa", code))) {
    return NextResponse.redirect(new URL("/error?code=confirmation_failed", origin))
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  if (next === "/reset-password") {
    if (!(await grantRecoverySession(supabase))) return NextResponse.redirect(new URL("/forgot-password", origin))
    return NextResponse.redirect(new URL(next, origin))
  }

  const { data: state, error: stateError } = await supabase.rpc("get_account_session_state")
  if (stateError || !state?.active) return NextResponse.redirect(new URL("/login", origin))
  if (!state.verified) return NextResponse.redirect(new URL("/check-email", origin))
  if (state.mfaRequired) return NextResponse.redirect(new URL("/auth/mfa", origin))

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return NextResponse.redirect(
      new URL("/error?code=membership_load_failed", origin)
    )
  }

  return NextResponse.redirect(
    new URL(membership ? next : "/onboarding", origin)
  )
}
