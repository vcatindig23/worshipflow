import { describe, expect, it } from "vitest"
import { describeActivity } from "../../src/lib/activity-log"

describe("describeActivity", () => {
  it("describes song and service changes", () => {
    expect(
      describeActivity({
        action: "song.archived",
        actor_name: "Alex",
        entity_name: "Amazing Grace",
        details: {},
      })
    ).toBe('Archived “Amazing Grace”.')

    expect(
      describeActivity({
        action: "service.song_added",
        actor_name: "Alex",
        entity_name: "Sunday Worship",
        details: { song_name: "Build My Life" },
      })
    ).toBe('Added “Build My Life” to the service “Sunday Worship”.')
  })

  it("describes team assignments with readable position names", () => {
    expect(
      describeActivity({
        action: "team.assigned",
        actor_name: "Alex",
        entity_name: "Youth Night",
        details: {
          member_name: "Sam",
          position: "lead_guitarist",
        },
      })
    ).toBe('Assigned Sam as Lead Guitarist for “Youth Night”.')
  })

  it("handles missing member details without exposing raw values", () => {
    expect(
      describeActivity({
        action: "member.role_changed",
        actor_name: "Alex",
        entity_name: "Team member",
        details: {},
      })
    ).toBe("Changed a team member’s role to Team Member.")
  })
})
