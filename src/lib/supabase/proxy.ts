import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getPublicEnv } from "./env"
import { isProtectedPath, needsSessionRefresh } from "@/lib/public-paths"

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
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
            supabaseResponse.cookies.set(name, value, options)
          })

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims)
  const isPrivate = isProtectedPath(pathname)

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
