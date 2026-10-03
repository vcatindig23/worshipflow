import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const code = searchParams.get("code")

  if (tokenHash && type) {
    const redirectUrl = new URL("/auth/confirm", origin)
    redirectUrl.searchParams.set("token_hash", tokenHash)
    redirectUrl.searchParams.set("type", type)

    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    return NextResponse.redirect(
      `${origin}/?auth_code=${encodeURIComponent(code)}`
    )
  }

  return NextResponse.redirect(`${origin}/error?code=confirmation_failed`)
}