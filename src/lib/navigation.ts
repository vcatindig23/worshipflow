function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/"
}

export function isActiveNavigationPath(pathname: string, href: string) {
  const currentPath = normalizePathname(pathname)
  const targetPath = normalizePathname(href)

  if (targetPath === "/") return currentPath === "/"

  // Team has its own navigation item; avoid marking both Team and Settings active.
  if (
    targetPath === "/settings" &&
    (currentPath === "/settings/team" ||
      currentPath.startsWith("/settings/team/"))
  ) {
    return false
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
