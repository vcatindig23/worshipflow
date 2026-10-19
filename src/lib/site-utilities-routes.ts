const routesWithoutSiteUtilities = [
  "/login", "/signup", "/forgot-password", "/reset-password", "/check-email",
  "/error", "/onboarding", "/auth",
] as const

export function shouldLoadSiteUtilities(pathname: string) {
  return !routesWithoutSiteUtilities.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}
