import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }

  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = getSafeNextPath(searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL("/error?code=confirmation_failed", origin)
    )
  }

  return NextResponse.redirect(new URL(next, origin))
}