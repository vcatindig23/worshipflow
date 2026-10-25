/** Keep authentication redirects on this app and out of callback/entry loops. */
export function getSafeAuthNextPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return "/"
  const origin = "https://worshipflow.invalid"
  const url = new URL(value, origin)
  if (
    url.origin !== origin ||
    /^\/(?:auth(?:\/|$)|login(?:\/|$)|signup(?:\/|$))/.test(url.pathname)
  )
    return "/"
  for (const key of [
    "code",
    "auth_code",
    "token_hash",
    "access_token",
    "refresh_token",
  ])
    url.searchParams.delete(key)
  return url.pathname + url.search + url.hash
}
