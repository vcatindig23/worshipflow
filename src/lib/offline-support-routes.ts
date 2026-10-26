const offlineAccountSyncExcludedRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/onboarding",
  "/auth/callback",
  "/auth/confirm",
  "/auth/mfa",
  "/auth/verify",
] as const

/**
 * Authentication and onboarding pages do not use offline stage storage.
 * Keep the Supabase browser client out of those route bundles.
 */
export function shouldSyncOfflineAccount(pathname: string) {
  return !offlineAccountSyncExcludedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
