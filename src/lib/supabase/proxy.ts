import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicEnv } from "./env"
import { isProtectedPath, needsSessionRefresh } from "@/lib/public-paths"
import { isSameOriginRequest, sessionCookieOptions } from "@/lib/auth-security"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOriginRequest(request.headers, request.url)) {
    return NextResponse.json({ error: "Request could not be verified. Reload the page and try again." }, { status: 403, headers: { "Cache-Control": "private, no-store" } })
  }
  // Let static/public content and unmatched URLs reach Next without an auth dependency.
  if (!needsSessionRefresh(pathname)) return NextResponse.next({ request })
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv()

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: sessionCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, { ...options, ...sessionCookieOptions(), maxAge: options.maxAge ?? sessionCookieOptions().maxAge })
          })

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  // Upgrade sessions issued before HttpOnly was enabled, without waiting for JWT refresh.
  for (const cookie of request.cookies.getAll()) {
    if (/^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/.test(cookie.name) && !supabaseResponse.cookies.has(cookie.name)) {
      supabaseResponse.cookies.set(cookie.name, cookie.value, sessionCookieOptions())
    }
  }
  let isAuthenticated = Boolean(data?.claims)
  const isPrivate = isProtectedPath(pathname)
  let needsMfa = false
  let verified = true
  if (isAuthenticated) {
    const { data: state, error } = await supabase.rpc("get_account_session_state")
    isAuthenticated = !error && state?.active === true
    needsMfa = state?.mfaRequired === true
    verified = state?.verified === true
  }

  const privateResponse = (response: NextResponse) => {
    if (response !== supabaseResponse) {
      for (const cookie of supabaseResponse.cookies.getAll())
        response.cookies.set(cookie)
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }

  if (!isAuthenticated && isPrivate) {
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return privateResponse(
        NextResponse.json(
          { error: "Authentication required." },
          { status: 401 }
        )
      )
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.search = ""

    return privateResponse(NextResponse.redirect(redirectUrl))
  }

  if (isAuthenticated && (!verified || needsMfa) && (isPrivate || pathname === "/" || pathname === "/login" || pathname === "/signup")) {
    if (pathname.startsWith("/api/")) {
      return privateResponse(NextResponse.json({ error: "Additional account verification required." }, { status: 403 }))
    }
    const target = verified ? "/auth/mfa" : "/check-email"
    return privateResponse(NextResponse.redirect(new URL(target, request.url)))
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""

    return privateResponse(NextResponse.redirect(redirectUrl))
  }

  return isPrivate || isAuthenticated
    ? privateResponse(supabaseResponse)
    : supabaseResponse
}
