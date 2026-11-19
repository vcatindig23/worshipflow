import { describe, expect, it } from "vitest"
import { availabilityEntrySchema } from "@/lib/member-availability-validation"

const base = {
  timezone: "Asia/Manila",
  title: "Personal commitment",
  reason: "Family event",
}

describe("member availability entry validation", () => {
  it("accepts a valid date-specific blockout", () => {
    const result = availabilityEntrySchema.safeParse({
      ...base,
      entryType: "blockout",
      startsOn: "2026-11-21",
      endsOn: "2026-11-23",
      weekdays: [],
    })

    expect(result.success).toBe(true)
  })

  it("rejects reversed or impossible blockout dates", () => {
    expect(availabilityEntrySchema.safeParse({
      ...base,
      entryType: "blockout",
      startsOn: "2026-11-23",
      endsOn: "2026-11-21",
    }).success).toBe(false)

    expect(availabilityEntrySchema.safeParse({
      ...base,
      entryType: "blockout",
      startsOn: "2026-02-30",
      endsOn: "2026-03-02",
    }).success).toBe(false)
  })

  it("accepts recurring availability with unique weekdays and a valid time range", () => {
    const result = availabilityEntrySchema.safeParse({
      ...base,
      entryType: "recurring",
      weekdays: [0, 2, 4],
      startTime: "08:30",
      endTime: "17:00",
    })

    expect(result.success).toBe(true)
  })

  it("rejects recurring availability with no weekdays or duplicate weekdays", () => {
    for (const weekdays of [[], [1, 1], [7]]) {
      expect(availabilityEntrySchema.safeParse({
        ...base,
        entryType: "recurring",
        weekdays,
        startTime: "08:00",
        endTime: "17:00",
      }).success).toBe(false)
    }
  })

  it("rejects recurring availability when the end time is not after the start", () => {
    for (const [startTime, endTime] of [["08:00", "08:00"], ["18:00", "09:00"]]) {
      expect(availabilityEntrySchema.safeParse({
        ...base,
        entryType: "recurring",
        weekdays: [1],
        startTime,
        endTime,
      }).success).toBe(false)
    }
  })

  it("rejects unsupported time zones and overlong notes", () => {
    expect(availabilityEntrySchema.safeParse({
      ...base,
      entryType: "blockout",
      startsOn: "2026-11-21",
      endsOn: "2026-11-21",
      timezone: "Not/A_Time_Zone",
    }).success).toBe(false)

    expect(availabilityEntrySchema.safeParse({
      ...base,
      entryType: "blockout",
      startsOn: "2026-11-21",
      endsOn: "2026-11-21",
      reason: "x".repeat(501),
    }).success).toBe(false)
  })
})
