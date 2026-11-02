import { describe, expect, it } from "vitest"
import { buildWorkspaceBreadcrumbs } from "@/lib/workspace-breadcrumbs"

describe("workspace breadcrumb paths", () => {
  it("uses a record title for a song detail path", () => {
    expect(buildWorkspaceBreadcrumbs(
      "/songs/8be01f3d-25f1-4ef4-b778-cd12dc6c69bd",
      "Grace in Every Season"
    )).toEqual([
      { href: "/songs", label: "Songs", current: false },
      {
        href: "/songs/8be01f3d-25f1-4ef4-b778-cd12dc6c69bd",
        label: "Grace in Every Season",
        current: true,
      },
    ])
  })

  it("keeps parent record and action labels meaningful on nested routes", () => {
    expect(buildWorkspaceBreadcrumbs(
      "/setlists/8be01f3d-25f1-4ef4-b778-cd12dc6c69bd/edit",
      "Sunday Worship"
    )).toEqual([
      { href: "/setlists", label: "Setlists", current: false },
      {
        href: "/setlists/8be01f3d-25f1-4ef4-b778-cd12dc6c69bd",
        label: "Sunday Worship",
        current: false,
      },
      {
        href: "/setlists/8be01f3d-25f1-4ef4-b778-cd12dc6c69bd/edit",
        label: "Edit",
        current: true,
      },
    ])
  })

  it("uses a useful contextual label rather than exposing an opaque record ID", () => {
    const crumbs = buildWorkspaceBreadcrumbs(
      "/services/templates/72acdc134f7e4e6f8fc9",
      "Sunday template"
    )
    expect(crumbs.map(({ label }) => label)).toEqual([
      "Services",
      "Templates",
      "Sunday template",
    ])
    expect(crumbs.at(-1)?.current).toBe(true)
  })

  it("returns no breadcrumbs at the dashboard root", () => {
    expect(buildWorkspaceBreadcrumbs("/")).toEqual([])
  })
})
