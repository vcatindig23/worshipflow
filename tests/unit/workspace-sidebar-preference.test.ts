import { describe, expect, it } from "vitest"
import {
  isWorkspaceSidebarHiddenPreference,
  WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY,
} from "@/lib/workspace-sidebar-preference"

describe("workspace sidebar visibility preference", () => {
  it("uses a stable browser preference key", () => {
    expect(WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY).toBe(
      "worshipflow-sidebar-hidden"
    )
  })

  it("keeps the sidebar visible when no preference has been saved", () => {
    expect(isWorkspaceSidebarHiddenPreference(null)).toBe(false)
  })

  it("restores the hidden state when requested", () => {
    expect(isWorkspaceSidebarHiddenPreference("true")).toBe(true)
  })

  it("treats false and invalid stored values as visible", () => {
    expect(isWorkspaceSidebarHiddenPreference("false")).toBe(false)
    expect(isWorkspaceSidebarHiddenPreference("hidden")).toBe(false)
    expect(isWorkspaceSidebarHiddenPreference("")).toBe(false)
  })
})
