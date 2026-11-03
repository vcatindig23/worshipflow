import { describe, expect, it } from "vitest"
import { getDashboardSetlistPriority } from "../../src/lib/dashboard-priorities"

const baseSetlist = {
  id: "service-123",
  name: "Sunday Worship",
  service_date: "2026-11-08",
  service_time: "09:00:00",
  readiness: {
    songCount: 3,
    totalAssignments: 4,
    pendingAssignments: 0,
    declinedAssignments: 0,
  },
}

describe("dashboard service priorities", () => {
  it("sends leaders to service settings when the schedule is incomplete", () => {
    const priority = getDashboardSetlistPriority(
      { ...baseSetlist, service_time: null },
      true,
    )

    expect(priority.href).toBe("/setlists/service-123/edit")
    expect(priority.actionLabel).toBe("Set schedule")
    expect(priority.complete).toBe(false)
  })

  it("sends users directly to the worship order when songs are missing", () => {
    const priority = getDashboardSetlistPriority(
      { ...baseSetlist, readiness: { ...baseSetlist.readiness, songCount: 0 } },
      true,
    )

    expect(priority.href).toBe("/setlists/service-123#worship-order")
    expect(priority.actionLabel).toBe("Add songs")
  })

  it("sends leaders directly to the worship team when nobody is assigned", () => {
    const priority = getDashboardSetlistPriority(
      { ...baseSetlist, readiness: { ...baseSetlist.readiness, totalAssignments: 0 } },
      true,
    )

    expect(priority.href).toBe("/setlists/service-123#worship-team")
    expect(priority.actionLabel).toBe("Assign team")
  })

  it("prioritizes declined responses before pending confirmations", () => {
    const priority = getDashboardSetlistPriority(
      {
        ...baseSetlist,
        readiness: {
          ...baseSetlist.readiness,
          pendingAssignments: 2,
          declinedAssignments: 1,
        },
      },
      true,
    )

    expect(priority.title).toBe("Resolve declined responses")
    expect(priority.href).toBe("/setlists/service-123#worship-team")
  })

  it("routes members without edit access to the service instead of edit settings", () => {
    const priority = getDashboardSetlistPriority(
      { ...baseSetlist, service_date: null },
      false,
    )

    expect(priority.href).toBe("/setlists/service-123")
    expect(priority.actionLabel).toBe("View service")
  })

  it("marks a fully prepared service as complete", () => {
    const priority = getDashboardSetlistPriority(baseSetlist, true)

    expect(priority.complete).toBe(true)
    expect(priority.href).toBe("/setlists/service-123")
  })
})
