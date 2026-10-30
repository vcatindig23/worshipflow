const immersiveWorkspaceRoutePatterns = [
  /^\/setlists\/[^/]+\/live\/?$/,
  /^\/songs\/[^/]+\/print\/?$/,
]

/**
 * Routes with their own dedicated presentation should not render the
 * standard workspace chrome around them.
 */
export function isImmersiveWorkspaceRoute(pathname: string) {
  return immersiveWorkspaceRoutePatterns.some((pattern) => pattern.test(pathname))
}
