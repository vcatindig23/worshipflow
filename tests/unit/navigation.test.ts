import { describe, expect, it } from "vitest"
import { isActiveNavigationPath } from "@/lib/navigation"

describe("navigation active-path matching", () => {
  it.each([
    { pathname: "/", href: "/", active: true },
    { pathname: "/songs", href: "/", active: false },
    { pathname: "/songs", href: "/songs", active: true },
    { pathname: "/songs/new", href: "/songs", active: true },
    { pathname: "/songs/abc/edit", href: "/songs", active: true },
    { pathname: "/songs-public", href: "/songs", active: false },
    { pathname: "/settings/team", href: "/settings/team", active: true },
    { pathname: "/settings/team/invitations", href: "/settings/team", active: true },
    { pathname: "/settings/church", href: "/settings/team", active: false },
    { pathname: "/songs/", href: "/songs", active: true },
  ])("matches $pathname against $href as $active", ({ pathname, href, active }) => {
    expect(isActiveNavigationPath(pathname, href)).toBe(active)
  })
})
