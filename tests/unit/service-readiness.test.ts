import { describe, expect, it } from "vitest"
import { getServiceReadiness } from "@/lib/service-readiness"

const scheduled = {
  service_date: "2026-11-08",
  service_time: "09:00",
}

describe("shared service readiness", () => {
  it("keeps the existing four equally weighted readiness checks", () => {
    const readiness = getServiceReadiness(scheduled, 2, [
      { confirmation_status: "confirmed" },
      { confirmation_status: "confirmed" },
    ])

    expect(readiness).toMatchObject({
      status: "ready",
      percentage: 100,
      completedChecks: 4,
      totalChecks: 4,
      confirmedAssignments: 2,
      totalAssignments: 2,
      hasSchedule: true,
      hasSongs: true,
      hasTeam: true,
      hasUnconfirmedTeam: false,
    })
  })

  it("counts missing schedule, songs, and team as incomplete essentials", () => {
    const readiness = getServiceReadiness(
      { service_date: null, service_time: null },
      0,
      []
    )

    expect(readiness).toMatchObject({
      status: "incomplete",
      percentage: 0,
      completedChecks: 0,
      hasSchedule: false,
      hasSongs: false,
      hasTeam: false,
    })
  })

  it("does not treat an empty team as a completed confirmation check", () => {
    const readiness = getServiceReadiness(scheduled, 1, [])

    expect(readiness).toMatchObject({
      status: "attention",
      percentage: 50,
      hasTeam: false,
      hasUnconfirmedTeam: false,
      confirmedAssignments: 0,
    })
  })

  it("reports pending and declined responses without marking the team confirmed", () => {
    const readiness = getServiceReadiness(scheduled, 1, [
      { confirmation_status: "confirmed" },
      { confirmation_status: "pending" },
      { confirmation_status: "declined" },
    ])

    expect(readiness).toMatchObject({
      status: "attention",
      percentage: 75,
      completedChecks: 3,
      confirmedAssignments: 1,
      pendingAssignments: 1,
      declinedAssignments: 1,
      totalAssignments: 3,
      hasUnconfirmedTeam: true,
    })
  })
  it("adds position coverage as a fifth readiness check only when requirements are configured", () => {
    const withoutRequirements = getServiceReadiness(scheduled, 1, [
      { confirmation_status: "confirmed" },
    ])

    expect(withoutRequirements).toMatchObject({
      totalChecks: 4,
      completedChecks: 4,
      percentage: 100,
      positionCoverage: null,
    })

    const withRequirements = getServiceReadiness(
      scheduled,
      1,
      [{ confirmation_status: "confirmed", team_position: "singer", user_id: "singer-1" }],
      [
        { team_position: "singer", required_count: 2 },
        { team_position: "drummer", required_count: 1 },
      ]
    )

    expect(withRequirements).toMatchObject({
      totalChecks: 5,
      completedChecks: 4,
      percentage: 80,
      positionCoverage: {
        requiredSlots: 3,
        assignedSlots: 1,
        vacantSlots: 2,
        isComplete: false,
      },
    })
  })

  it("keeps configured position coverage separate from member confirmations", () => {
    const readiness = getServiceReadiness(
      scheduled,
      1,
      [
        { confirmation_status: "confirmed", team_position: "singer", user_id: "singer-1" },
        { confirmation_status: "pending", team_position: "singer", user_id: "singer-2" },
      ],
      [{ team_position: "singer", required_count: 2 }]
    )

    expect(readiness).toMatchObject({
      totalChecks: 5,
      completedChecks: 4,
      positionCoverage: {
        requiredSlots: 2,
        assignedSlots: 2,
        confirmedSlots: 1,
        pendingAssignments: 1,
        vacantSlots: 0,
        isComplete: true,
      },
    })
  })


})
