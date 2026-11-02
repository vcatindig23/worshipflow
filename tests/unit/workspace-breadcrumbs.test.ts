import { describe, expect, it } from "vitest"
import { getWorkspaceBreadcrumbs } from "@/lib/workspace-breadcrumbs"

describe("workspace breadcrumbs", () => {
  it.each([
    ["/songs/3a1b/song-edit", ["Songs", "Song chart", "Edit"]],
    ["/setlists/4b2c", ["Setlists", "Service plan"]],
    ["/settings/team/invitations", ["Settings", "Team", "Details"]],
    ["/services/templates", ["Services", "Service templates"]],
    ["/profile/9d8e", ["Profile", "Member profile"]],
    ["/chat", ["Team chat"]],
    ["/files", ["Files"]],
  ])("provides useful labels for %s", (pathname, expectedLabels) => {
    expect(getWorkspaceBreadcrumbs(pathname).map((item) => item.label)).toEqual(expectedLabels)
  })

  it("keeps every parent destination linkable and marks only the final crumb current", () => {
    const crumbs = getWorkspaceBreadcrumbs("/songs/song-123/edit")
    expect(crumbs.map((item) => item.href)).toEqual([
      "/songs",
      "/songs/song-123",
      "/songs/song-123/edit",
    ])
    expect(crumbs.map((item) => item.current)).toEqual([false, false, true])
  })
})
