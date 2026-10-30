import { describe, expect, it } from "vitest"
import { isActiveNavigationPath } from "@/lib/navigation"
import { isImmersiveWorkspaceRoute } from "@/lib/workspace-layout"
import {
  workspaceNavigationItems,
  workspaceSettingsNavigationItem,
} from "@/lib/workspace-navigation"

describe("shared workspace navigation", () => {
  it("exposes each requested workspace destination exactly once", () => {
    const destinations = [
      ...workspaceNavigationItems.map(({ label, href }) => ({ label, href })),
      {
        label: workspaceSettingsNavigationItem.label,
        href: workspaceSettingsNavigationItem.href,
      },
    ]

    expect(destinations).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Songs", href: "/songs" },
      { label: "Chord Chart", href: "/chord-chart" },
      { label: "Setlists", href: "/setlists" },
      { label: "Services", href: "/services" },
      { label: "My Schedule", href: "/my-schedule" },
      { label: "Team", href: "/settings/team" },
      { label: "Files", href: "/files" },
      { label: "Profile", href: "/profile" },
      { label: "Settings", href: "/settings" },
    ])
    expect(new Set(destinations.map(({ href }) => href)).size).toBe(destinations.length)
  })

  it("keeps Team and Settings active states mutually exclusive", () => {
    expect(isActiveNavigationPath("/settings/team", "/settings/team")).toBe(true)
    expect(isActiveNavigationPath("/settings/team", "/settings")).toBe(false)
    expect(isActiveNavigationPath("/settings/team/audit", "/settings/team")).toBe(true)
    expect(isActiveNavigationPath("/settings/church", "/settings")).toBe(true)
  })

  it("uses the same route rules for section descendants", () => {
    expect(isActiveNavigationPath("/songs/abc/edit", "/songs")).toBe(true)
    expect(isActiveNavigationPath("/setlists/abc/live", "/setlists")).toBe(true)
    expect(isActiveNavigationPath("/files", "/profile")).toBe(false)
  })
})


describe("immersive workspace route handling", () => {
  it.each([
    "/setlists/3ff5d636-afc4-4323-8b3c-8de6789520e6/live",
    "/setlists/service-123/live/",
    "/songs/song-123/print",
    "/songs/song-123/print/",
  ])("bypasses the shared shell for %s", (pathname) => {
    expect(isImmersiveWorkspaceRoute(pathname)).toBe(true)
  })

  it.each([
    "/setlists",
    "/setlists/service-123",
    "/setlists/service-123/edit",
    "/songs",
    "/songs/song-123",
    "/songs/song-123/edit",
  ])("keeps standard workspace chrome on %s", (pathname) => {
    expect(isImmersiveWorkspaceRoute(pathname)).toBe(false)
  })
})
