export const WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY =
  "worshipflow-sidebar-hidden"

export function isWorkspaceSidebarHiddenPreference(
  value: string | null
): boolean {
  return value === "true"
}
