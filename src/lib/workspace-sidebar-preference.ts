export const WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY =
  "worshipflow-sidebar-hidden"
export const WORKSPACE_SIDEBAR_COLLAPSED_STORAGE_KEY =
  "worshipflow-sidebar-collapsed"

export function isWorkspaceSidebarHiddenPreference(
  value: string | null
): boolean {
  return value === "true"
}

export function isWorkspaceSidebarCollapsedPreference(
  value: string | null
): boolean {
  return value === "true"
}
