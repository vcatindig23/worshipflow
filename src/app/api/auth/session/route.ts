import { NextRequest, NextResponse } from "next/server"
import { isSameOriginRequest } from "@/lib/auth-security"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie, Origin" }
  if (!isSameOriginRequest(request.headers, request.url) || request.headers.get("x-worshipflow-client") !== "browser") {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403, headers })
  }
  const supabase = await createClient()
  const { data: claims, error } = await supabase.auth.getClaims()
  if (error || !claims?.claims?.sub) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers })
  const { data: state, error: stateError } = await supabase.rpc("get_account_session_state")
  if (stateError || !state?.active || !state.verified || state.mfaRequired) {
    return NextResponse.json({ error: "Sign in again to continue." }, { status: 401, headers })
  }
  // getSession is used only after verified claims and current database session checks.
  const { data } = await supabase.auth.getSession()
  if (!data.session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers })
  return NextResponse.json({
    access_token: data.session.access_token,
    expires_at: data.session.expires_at,
    user: { id: claims.claims.sub },
  }, { headers })
}
