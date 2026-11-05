import { describe, expect, it } from "vitest"
import { getScheduleConflicts } from "@/lib/schedule-conflicts"

const service = (
  id: string,
  name: string,
  service_date: string | null,
  service_time: string | null
) => ({ id, name, service_date, service_time })

describe("schedule conflict detection", () => {
  it("flags overlapping one-hour service assignments on the same day", () => {
    const conflicts = getScheduleConflicts([
      service("a", "Morning Worship", "2026-11-08", "09:00"),
      service("b", "Youth Worship", "2026-11-08", "09:30"),
      service("c", "Evening Worship", "2026-11-08", "18:00"),
    ])

    expect(conflicts.get("a")).toEqual([
      { serviceId: "b", serviceName: "Youth Worship" },
    ])
    expect(conflicts.get("b")).toEqual([
      { serviceId: "a", serviceName: "Morning Worship" },
    ])
    expect(conflicts.has("c")).toBe(false)
  })

  it("does not treat back-to-back service windows as overlapping", () => {
    const conflicts = getScheduleConflicts([
      service("a", "First Service", "2026-11-08", "09:00"),
      service("b", "Second Service", "2026-11-08", "10:00"),
    ])

    expect(conflicts.size).toBe(0)
  })

  it("detects service windows that cross midnight", () => {
    const conflicts = getScheduleConflicts([
      service("a", "Late Service", "2026-11-08", "23:30"),
      service("b", "Early Service", "2026-11-09", "00:00"),
    ])

    expect(conflicts.get("a")?.[0]?.serviceId).toBe("b")
    expect(conflicts.get("b")?.[0]?.serviceId).toBe("a")
  })

  it("ignores services without a valid date or start time", () => {
    const conflicts = getScheduleConflicts([
      service("a", "Unscheduled", null, null),
      service("b", "Invalid Time", "2026-11-08", "25:00"),
      service("c", "Scheduled", "2026-11-08", "09:00"),
    ])

    expect(conflicts.size).toBe(0)
  })

  it("uses a supplied duration when a service has a different planned length", () => {
    const conflicts = getScheduleConflicts([
      service("a", "Long Service", "2026-11-08", "09:00"),
      service("b", "Second Service", "2026-11-08", "10:30"),
    ], 90)

    expect(conflicts.get("a")?.[0]?.serviceId).toBe("b")
  })
})
