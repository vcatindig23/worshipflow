const publicPaths = [
  "/login", "/signup", "/forgot-password", "/reset-password", "/check-email",
  "/error", "/auth/confirm", "/auth/callback", "/manifest.webmanifest",
  "/robots.txt", "/sitemap.xml",
] as const

export function isPublicPath(pathname: string) {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )
}
