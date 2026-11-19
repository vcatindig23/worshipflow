import { describe, expect, it } from "vitest"
import {
  buildActiveScheduleAssignmentsMap,
  buildScheduleEvents,
  findScheduleConflicts,
  findProposedMemberScheduleConflicts,
  getScheduleConflictSignature,
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
  it("detects an existing overlap before a proposed member is assigned", () => {
    const events = buildScheduleEvents(schedules)
    const assignments = new Map<string, Set<string>>([
      ["service-b", new Set(["candidate-member"])],
    ])

    const conflicts = findProposedMemberScheduleConflicts(
      "service-a",
      "candidate-member",
      events,
      assignments,
      new Map([["candidate-member", "Candidate Member"]])
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].other.setlistId).toBe("service-b")
    expect(conflicts[0].memberNames).toEqual(["Candidate Member"])
    expect(assignments.has("service-a")).toBe(false)
  })

  it("checks both the target service and its rehearsal against the proposed member's schedule", () => {
    const events = buildScheduleEvents([
      {
        ...schedules[0],
        service_time: "09:00:00",
        end_time: "10:00:00",
        rehearsal_date: "2026-11-08",
        rehearsal_time: "16:00:00",
        rehearsal_end_time: "17:00:00",
      },
      {
        ...schedules[1],
        service_time: "16:15:00",
        end_time: "17:15:00",
        rehearsal_date: null,
        rehearsal_time: null,
        rehearsal_end_time: null,
      },
    ])
    const assignments = new Map<string, Set<string>>([
      ["service-b", new Set(["candidate-member"])],
    ])

    const conflicts = findProposedMemberScheduleConflicts(
      "service-a",
      "candidate-member",
      events,
      assignments
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].current.kind).toBe("Rehearsal")
    expect(conflicts[0].other.kind).toBe("Service")
  })

  it("does not report a conflict for a proposed member with no overlapping commitments", () => {
    const events = buildScheduleEvents(schedules)
    const assignments = new Map<string, Set<string>>([
      ["service-b", new Set(["another-member"])],
    ])

    expect(
      findProposedMemberScheduleConflicts(
        "service-a",
        "candidate-member",
        events,
        assignments
      )
    ).toHaveLength(0)
  })
  it("creates a stable signature for the exact conflicts a leader reviewed", () => {
    const events = buildScheduleEvents(schedules)
    const assignments = new Map<string, Set<string>>([
      ["service-b", new Set(["candidate-member"])],
      ["service-c", new Set(["candidate-member"])],
    ])
    const conflicts = findProposedMemberScheduleConflicts(
      "service-a",
      "candidate-member",
      events,
      assignments
    )

    expect(conflicts).toHaveLength(2)
    const signature = getScheduleConflictSignature(conflicts)
    expect(signature).toContain("service-a:service")
    expect(signature).toContain("service-b:service")
    expect(signature).toContain("service-c:service")
    expect(getScheduleConflictSignature([...conflicts].reverse())).toBe(signature)

    const changedTimeConflicts = conflicts.map((conflict) => ({
      ...conflict,
      other: {
        ...conflict.other,
        endMinutes: conflict.other.endMinutes + 15,
      },
    }))
    expect(getScheduleConflictSignature(changedTimeConflicts)).not.toBe(signature)
  })

  it("treats pending and confirmed assignments as active but ignores declined assignments", () => {
    const assignments = buildActiveScheduleAssignmentsMap([
      { setlist_id: "service-a", user_id: "pending-member", confirmation_status: "pending" },
      { setlist_id: "service-a", user_id: "confirmed-member", confirmation_status: "confirmed" },
      { setlist_id: "service-a", user_id: "declined-member", confirmation_status: "declined" },
    ])

    expect(assignments.get("service-a")).toEqual(
      new Set(["pending-member", "confirmed-member"])
    )
  })


  it("expands service and rehearsal commitments by their configured preparation and travel buffers", () => {
    const events = buildScheduleEvents([
      {
        ...schedules[0],
        service_prep_buffer_minutes: 15,
        service_travel_buffer_minutes: 30,
        rehearsal_prep_buffer_minutes: 10,
        rehearsal_travel_buffer_minutes: 20,
      },
    ])

    expect(events.find((event) => event.key === "service-a:service")).toMatchObject({
      prepBufferMinutes: 15,
      travelBufferMinutes: 30,
      conflictStartAtMinute: 540 + 7 * 1440 - 15,
      conflictEndAtMinute: 630 + 7 * 1440 + 30,
    })
    expect(events.find((event) => event.key === "service-a:rehearsal")).toMatchObject({
      prepBufferMinutes: 10,
      travelBufferMinutes: 20,
    })
  })

  it("detects short gaps that are consumed by the previous travel and next preparation buffers", () => {
    const events = buildScheduleEvents([
      {
        ...schedules[0],
        rehearsal_date: null,
        rehearsal_time: null,
        service_time: "09:00:00",
        end_time: "10:30:00",
        service_travel_buffer_minutes: 25,
      },
      {
        ...schedules[1],
        service_time: "10:45:00",
        end_time: "11:45:00",
        service_prep_buffer_minutes: 10,
        rehearsal_date: null,
        rehearsal_time: null,
        rehearsal_end_time: null,
      },
    ])
    const assignments = new Map<string, Set<string>>([
      ["service-a", new Set(["shared-member"])],
      ["service-b", new Set(["shared-member"])],
    ])

    const conflicts = findScheduleConflicts(
      "service-a",
      events,
      assignments,
      new Map([["shared-member", "Shared Member"]])
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].other.setlistId).toBe("service-b")
    expect(conflicts[0].other.prepBufferMinutes).toBe(10)
    expect(conflicts[0].current.travelBufferMinutes).toBe(25)
  })

  it("detects a travel buffer that crosses midnight into the next calendar day", () => {
    const events = buildScheduleEvents([
      {
        ...schedules[0],
        service_date: "2026-11-07",
        service_time: "23:00:00",
        end_time: "23:30:00",
        rehearsal_date: null,
        rehearsal_time: null,
        service_travel_buffer_minutes: 45,
      },
      {
        ...schedules[1],
        service_date: "2026-11-08",
        service_time: "00:05:00",
        end_time: "01:00:00",
        rehearsal_date: null,
        rehearsal_time: null,
      },
    ])
    const assignments = new Map<string, Set<string>>([
      ["service-a", new Set(["shared-member"])],
      ["service-b", new Set(["shared-member"])],
    ])

    const conflicts = findScheduleConflicts(
      "service-a",
      events,
      assignments,
      new Map()
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].other.date).toBe("2026-11-08")
  })

  it("keeps schedules with zero buffers unchanged and ignores invalid buffer values safely", () => {
    const noBuffers = buildScheduleEvents([schedules[0]])
    const invalidBuffers = buildScheduleEvents([{
      ...schedules[0],
      service_prep_buffer_minutes: -10,
      service_travel_buffer_minutes: 241,
    }])

    expect(invalidBuffers[0].prepBufferMinutes).toBe(0)
    expect(invalidBuffers[0].travelBufferMinutes).toBe(0)
    expect(invalidBuffers[0].conflictStartAtMinute).toBe(noBuffers[0].conflictStartAtMinute)
    expect(invalidBuffers[0].conflictEndAtMinute).toBe(noBuffers[0].conflictEndAtMinute)
  })


})
