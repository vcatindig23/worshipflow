import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = getSafeAuthNextPath(searchParams.get("next"))
  const providerError =
    searchParams.get("error") ?? searchParams.get("error_description")

  if (!code || providerError) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  const supabase = await createClient()
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    console.error("Auth callback code exchange failed:", {
      message: exchangeError.message,
    })
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    console.error("Auth callback could not validate the resulting session:", {
      message: claimsError?.message ?? "No user ID was returned.",
    })
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  if (next === "/reset-password") {
    return NextResponse.redirect(new URL(next, origin))
  }

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
