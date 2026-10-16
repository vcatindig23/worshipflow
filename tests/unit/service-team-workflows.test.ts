import { describe, expect, it } from "vitest"
import { describeActivity } from "../../src/lib/activity-log"
import {
  getCalendarDateRange,
  isValidServiceDate,
  isValidServiceTime,
} from "../../src/lib/service-scheduling"
import { getTeamPositionLabel } from "../../src/lib/team-positions"

describe("service scheduling boundaries", () => {
  it("accepts leap days only in leap years", () => {
    expect(isValidServiceDate("2028-02-29")).toBe(true)
    expect(isValidServiceDate("2026-02-29")).toBe(false)
    expect(isValidServiceDate("2026-04-31")).toBe(false)
  })

  it("accepts valid 24-hour times and rejects out-of-range values", () => {
    expect(isValidServiceTime("00:00")).toBe(true)
    expect(isValidServiceTime("23:59")).toBe(true)
    expect(isValidServiceTime("24:00")).toBe(false)
    expect(isValidServiceTime("12:60")).toBe(false)
    expect(isValidServiceTime("9:05")).toBe(false)
  })

  it("keeps midnight calendar events on the correct date", () => {
    expect(getCalendarDateRange("2026-10-11", "00:00")).toBe(
      "20261011T000000/20261011T010000"
    )
  })

  it("ends an event at midnight on the following date without losing the boundary", () => {
    expect(getCalendarDateRange("2026-10-11", "23:00")).toBe(
      "20261011T230000/20261012T000000"
    )
  })
})

describe("team position labels", () => {
  it("formats common worship and production positions", () => {
    expect(getTeamPositionLabel("worship_leader")).toBe("Worship Leader")
    expect(getTeamPositionLabel("drummer")).toBe("Drummer")
    expect(getTeamPositionLabel("sound_engineer")).toBe("Sound Engineer")
    expect(getTeamPositionLabel("audio_visual")).toBe("Audio / Visual")
  })

  it("preserves unknown position identifiers instead of hiding them", () => {
    expect(getTeamPositionLabel("stage_manager")).toBe("stage_manager")
  })
})

describe("team activity descriptions", () => {
  it("describes member position updates with readable labels", () => {
    expect(
      describeActivity({
        action: "member.positions_changed",
        actor_name: "Alex",
        entity_name: "Team member",
        details: {
          member_name: "Sam",
          team_positions: ["drummer", 42, "audio_visual"],
        },
      })
    ).toBe("Updated Sam’s team positions to Drummer, Audio / Visual.")
  })

  it("uses safe, readable defaults when assignment details are missing", () => {
    expect(
      describeActivity({
        action: "team.unassigned",
        actor_name: "Alex",
        entity_name: "Sunday Worship",
        details: {},
      })
    ).toBe("Removed a team member as Other from “Sunday Worship”.")
  })
})
