import { describe, expect, it } from "vitest"
import {
  isWorkspaceSidebarCollapsedPreference,
  isWorkspaceSidebarHiddenPreference,
  WORKSPACE_SIDEBAR_COLLAPSED_STORAGE_KEY,
  WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY,
} from "@/lib/workspace-sidebar-preference"

describe("workspace sidebar visibility preferences", () => {
  it("uses stable browser preference keys", () => {
    expect(WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY).toBe(
      "worshipflow-sidebar-hidden"
    )
    expect(WORKSPACE_SIDEBAR_COLLAPSED_STORAGE_KEY).toBe(
      "worshipflow-sidebar-collapsed"
    )
  })

  it("keeps the sidebar visible and expanded when no preference has been saved", () => {
    expect(isWorkspaceSidebarHiddenPreference(null)).toBe(false)
    expect(isWorkspaceSidebarCollapsedPreference(null)).toBe(false)
  })

  it("restores hidden and icon-only states independently", () => {
    expect(isWorkspaceSidebarHiddenPreference("true")).toBe(true)
    expect(isWorkspaceSidebarCollapsedPreference("true")).toBe(true)
    expect(isWorkspaceSidebarHiddenPreference("false")).toBe(false)
    expect(isWorkspaceSidebarCollapsedPreference("false")).toBe(false)
  })

  it("treats invalid stored values as visible and expanded", () => {
    expect(isWorkspaceSidebarHiddenPreference("hidden")).toBe(false)
    expect(isWorkspaceSidebarCollapsedPreference("collapsed")).toBe(false)
    expect(isWorkspaceSidebarHiddenPreference("")).toBe(false)
    expect(isWorkspaceSidebarCollapsedPreference("")).toBe(false)
  })
})
