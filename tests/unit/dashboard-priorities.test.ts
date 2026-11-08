import { readFileSync } from "node:fs"
import { join } from "node:path"
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


const dashboardView = readFileSync(
  join(process.cwd(), "src/components/dashboard-view.tsx"),
  "utf8",
)
const workspaceLoader = readFileSync(
  join(process.cwd(), "src/lib/workspace/get-workspace.ts"),
  "utf8",
)

describe("role-aware dashboard presentation", () => {
  it("renders members' real assignment confirmation controls on the dashboard", () => {
    expect(dashboardView).toContain('id="your-upcoming-assignments"')
    expect(dashboardView).toContain("<AssignmentConfirmation")
    expect(dashboardView).toContain("positionLabel={getTeamPositionLabel(confirmation.position)}")
    expect(dashboardView).toContain('href: "#your-upcoming-assignments"')
    expect(workspaceLoader).toContain("confirmation_status, responded_at, response_note")
  })

  it("limits the team roster preview while preserving the full assignment count", () => {
    expect(dashboardView).toContain("teamAssignments.slice(0, 4)")
    expect(dashboardView).toContain("hiddenAssignmentCount")
    expect(dashboardView).toContain('leaderRoles.includes(workspace.role)')
  })

  it("wraps long workspace and song names without forcing horizontal overflow", () => {
    expect(dashboardView).toContain("[overflow-wrap:anywhere]")
    expect(dashboardView).toContain("min-w-0")
    expect(dashboardView).toContain("line-clamp-2")
  })

  it("keeps the getting-started checklist limited to administrators", () => {
    expect(dashboardView).toContain('workspace.role === "admin"')
    expect(dashboardView).toContain('href: "/settings/team"')
    expect(dashboardView).toContain("Make your first assignment")
  })

  it("surfaces the next service readiness from the real workspace data", () => {
    expect(dashboardView).toContain("const featuredService = workspace.upcomingSetlists[0] ?? null")
    expect(dashboardView).toContain('aria-label="Next service readiness"')
    expect(dashboardView).toContain("featuredService.readiness.percentage")
    expect(dashboardView).toContain("featuredService.readiness.songCount")
    expect(dashboardView).toContain("featuredService.readiness.totalAssignments")
  })

  it("shows real workspace totals as direct navigation links", () => {
    expect(dashboardView).toContain('aria-label="Workspace at a glance"')
    expect(dashboardView).toContain('aria-label={"View " + workspace.songCount + " active songs"}')
    expect(dashboardView).toContain('aria-label={"View " + workspace.setlistCount + " service plans"}')
    expect(dashboardView).toContain('aria-label={"View " + workspace.memberCount + " team members"}')
  })

  it("uses one service-priority tour target for leaders and members", () => {
    expect(dashboardView).toContain('data-tour="team-priorities"')
    expect(dashboardView).toContain('data-tour={!isTeamLeader ? "team-priorities" : undefined}')
    expect(dashboardView).not.toContain('id="dashboard-priorities-title"')
  })
})
