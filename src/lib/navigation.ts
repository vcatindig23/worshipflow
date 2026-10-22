function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/"
}

export function isActiveNavigationPath(pathname: string, href: string) {
  const currentPath = normalizePathname(pathname)
  const targetPath = normalizePathname(href)

  if (targetPath === "/") return currentPath === "/"
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
