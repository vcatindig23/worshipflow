import { describe, expect, it } from "vitest"
import {
  buildScheduleEvents,
  findScheduleConflicts,
  timeToMinutes,
  type SetlistSchedule,
} from "@/lib/schedule-conflicts"

const schedules: SetlistSchedule[] = [
  {
    id: "service-a",
    name: "Sunday Worship",
    service_date: "2026-11-08",
    service_time: "09:00:00",
    end_time: "10:30:00",
    status: "published",
    completed_at: null,
    rehearsal_date: "2026-11-07",
    rehearsal_time: "16:00:00",
    rehearsal_end_time: null,
  },
  {
    id: "service-b",
    name: "Youth Fellowship",
    service_date: "2026-11-08",
    service_time: "10:00:00",
    end_time: "11:00:00",
    status: "published",
    completed_at: null,
    rehearsal_date: null,
    rehearsal_time: null,
    rehearsal_end_time: null,
  },
  {
    id: "service-c",
    name: "Another Ministry",
    service_date: "2026-11-08",
    service_time: "10:15:00",
    end_time: "11:15:00",
    status: "published",
    completed_at: null,
    rehearsal_date: null,
    rehearsal_time: null,
    rehearsal_end_time: null,
  },
  {
    id: "archived",
    name: "Archived service",
    service_date: "2026-11-08",
    service_time: "09:30:00",
    end_time: null,
    status: "archived",
    completed_at: null,
    rehearsal_date: null,
    rehearsal_time: null,
    rehearsal_end_time: null,
  },
  {
    id: "completed",
    name: "Completed service",
    service_date: "2026-11-08",
    service_time: "09:30:00",
    end_time: null,
    status: "published",
    completed_at: "2026-11-08T04:00:00.000Z",
    rehearsal_date: null,
    rehearsal_time: null,
    rehearsal_end_time: null,
  },
]

describe("shared service and rehearsal conflict checks", () => {
  it("builds service and rehearsal events with the established duration estimates", () => {
    const events = buildScheduleEvents(schedules)

    expect(events.find((event) => event.key === "service-a:service")).toMatchObject({
      startMinutes: 540,
      endMinutes: 630,
    })
    expect(events.find((event) => event.key === "service-a:rehearsal")).toMatchObject({
      startMinutes: 960,
      endMinutes: 1050,
      endTime: "5:30 PM",
    })
    expect(events.some((event) => event.setlistId === "archived")).toBe(false)
    expect(events.some((event) => event.setlistId === "completed")).toBe(false)
  })

  it("finds overlapping assignments for the current member only", () => {
    const events = buildScheduleEvents(schedules)
    const assignments = new Map<string, Set<string>>([
      ["service-a", new Set(["current-member", "other-member"])],
      ["service-b", new Set(["current-member"])],
      ["service-c", new Set(["other-member"])],
    ])

    const conflicts = findScheduleConflicts(
      "service-a",
      events,
      assignments,
      new Map([["current-member", "Current member"], ["other-member", "Other member"]]),
      "current-member"
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].other.setlistId).toBe("service-b")
    expect(conflicts[0].memberNames).toEqual(["Current member"])
  })

  it("retains shared-team conflict details for the service preparation overview", () => {
    const events = buildScheduleEvents(schedules)
    const assignments = new Map<string, Set<string>>([
      ["service-a", new Set(["current-member", "other-member"])],
      ["service-b", new Set(["current-member"])],
      ["service-c", new Set(["other-member"])],
    ])

    const conflicts = findScheduleConflicts(
      "service-a",
      events,
      assignments,
      new Map([["current-member", "Current member"], ["other-member", "Other member"]])
    )

    expect(conflicts).toHaveLength(2)
    expect(conflicts.map((conflict) => conflict.memberNames)).toEqual([
      ["Current member"],
      ["Other member"],
    ])
  })

  it("does not count events that only touch at the end boundary as overlapping", () => {
    const events = buildScheduleEvents([
      { ...schedules[0], rehearsal_date: null, rehearsal_time: null },
      {
        ...schedules[1],
        service_time: "10:30:00",
        end_time: "11:30:00",
      },
    ])
    const assignments = new Map<string, Set<string>>([
      ["service-a", new Set(["current-member"])],
      ["service-b", new Set(["current-member"])],
    ])

    expect(
      findScheduleConflicts("service-a", events, assignments, new Map(), "current-member")
    ).toHaveLength(0)
  })

  it("parses wall-clock times and rejects malformed values", () => {
    expect(timeToMinutes("09:45:00")).toBe(585)
    expect(timeToMinutes("24:00")).toBeNull()
    expect(timeToMinutes("invalid")).toBeNull()
    expect(timeToMinutes(null)).toBeNull()
  })
})
