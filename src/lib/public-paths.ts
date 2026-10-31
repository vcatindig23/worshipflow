// Explicit public routes prevent an accidental prefix match from exposing new pages.
export const publicPaths = [
  "/",
  "/faq",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/error",
  "/auth/confirm",
  "/auth/callback",
  "/auth/mfa",
  "/auth/verify",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/robots.md",
  "/sw.js",
  "/offline-stage.html",
  "/offline-stage.js",
  "/opengraph-image",
  // These component fixtures are enabled only by the Playwright test server.
  "/e2e/live-stage",
  "/e2e/song-stage",
] as const

export const protectedRouteRoots = [
  "/activity",
  "/chat",
  "/chord-chart",
  "/files",
  "/my-schedule",
  "/notifications",
  "/onboarding",
  "/profile",
  "/search",
  "/services",
  "/setlists",
  "/settings",
  "/songs",
  "/api",
] as const

export function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname === path)
}

export function isProtectedPath(pathname: string) {
  return protectedRouteRoots.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

// These responses have no personalized server content and need no session refresh.
export function needsSessionRefresh(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/auth/mfa" ||
    pathname === "/reset-password" ||
    isProtectedPath(pathname)
  )
}
