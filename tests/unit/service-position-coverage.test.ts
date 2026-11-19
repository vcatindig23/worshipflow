import { describe, expect, it } from "vitest"
import { getServicePositionCoverage } from "@/lib/service-position-coverage"

describe("service position coverage", () => {
  it("calculates the example team coverage across grouped guitarist assignments", () => {
    const coverage = getServicePositionCoverage(
      [
        { team_position: "worship_leader", required_count: 1 },
        { team_position: "singer", required_count: 3 },
        { team_position: "guitarist", required_count: 2 },
        { team_position: "keyboardist", required_count: 1 },
        { team_position: "drummer", required_count: 1 },
      ],
      [
        { user_id: "leader", team_position: "worship_leader", confirmation_status: "confirmed" },
        { user_id: "singer-1", team_position: "singer", confirmation_status: "confirmed" },
        { user_id: "singer-2", team_position: "singer", confirmation_status: "pending" },
        { user_id: "guitar-1", team_position: "lead_guitarist", confirmation_status: "confirmed" },
        { user_id: "guitar-2", team_position: "acoustic_guitarist", confirmation_status: "confirmed" },
        { user_id: "keyboardist", team_position: "keyboardist", confirmation_status: "confirmed" },
      ]
    )

    expect(coverage).toMatchObject({
      requiredSlots: 8,
      assignedSlots: 6,
      filledSlots: 6,
      confirmedSlots: 5,
      pendingAssignments: 1,
      declinedAssignments: 0,
      vacantSlots: 2,
      percentage: 75,
      isComplete: false,
    })
    expect(coverage?.rows).toEqual([
      expect.objectContaining({ teamPosition: "worship_leader", assigned: 1, required: 1, vacant: 0 }),
      expect.objectContaining({ teamPosition: "singer", assigned: 2, required: 3, pending: 1, vacant: 1 }),
      expect.objectContaining({ teamPosition: "guitarist", label: "Guitarists", assigned: 2, required: 2, vacant: 0 }),
      expect.objectContaining({ teamPosition: "keyboardist", assigned: 1, required: 1, vacant: 0 }),
      expect.objectContaining({ teamPosition: "drummer", assigned: 0, required: 1, vacant: 1 }),
    ])
  })

  it("does not count declined assignments as filled positions", () => {
    const coverage = getServicePositionCoverage(
      [{ team_position: "singer", required_count: 2 }],
      [
        { user_id: "singer-1", team_position: "singer", confirmation_status: "confirmed" },
        { user_id: "singer-2", team_position: "singer", confirmation_status: "declined" },
      ]
    )

    expect(coverage).toMatchObject({
      assignedSlots: 1,
      confirmedSlots: 1,
      declinedAssignments: 1,
      vacantSlots: 1,
      percentage: 50,
    })
  })

  it("counts one member once in the grouped guitarist requirement", () => {
    const coverage = getServicePositionCoverage(
      [{ team_position: "guitarist", required_count: 2 }],
      [
        { user_id: "member-1", team_position: "lead_guitarist", confirmation_status: "confirmed" },
        { user_id: "member-1", team_position: "electric_guitarist", confirmation_status: "pending" },
      ]
    )

    expect(coverage).toMatchObject({
      assignedSlots: 1,
      confirmedSlots: 1,
      pendingAssignments: 0,
      vacantSlots: 1,
    })
  })

  it("returns null when no position requirements are configured", () => {
    expect(getServicePositionCoverage([], [])).toBeNull()
    expect(getServicePositionCoverage(
      [{ team_position: "singer", required_count: 0 }],
      []
    )).toBeNull()
  })
})
