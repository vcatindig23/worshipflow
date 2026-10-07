import { describe, expect, it } from "vitest"
import {
  formatServiceTime,
  getCalendarDateRange,
  isValidServiceDate,
  isValidServiceTime,
} from "../../src/lib/service-scheduling"

describe("service scheduling", () => {
  it("accepts real service dates and rejects impossible dates", () => {
    expect(isValidServiceDate("2026-10-11")).toBe(true)
    expect(isValidServiceDate("2026-02-29")).toBe(false)
    expect(isValidServiceDate("2026-13-01")).toBe(false)
    expect(isValidServiceDate("20261011")).toBe(false)
  })

  it("validates optional service times in 24-hour input format", () => {
    expect(isValidServiceTime("09:00")).toBe(true)
    expect(isValidServiceTime("23:59")).toBe(true)
    expect(isValidServiceTime("24:00")).toBe(false)
    expect(isValidServiceTime("9:00")).toBe(false)
  })

  it("creates timed Google Calendar ranges with a one-hour duration", () => {
    expect(getCalendarDateRange("2026-10-11", "09:30:00")).toBe(
      "20261011T093000/20261011T103000"
    )
  })

  it("handles timed events that end on the next day", () => {
    expect(getCalendarDateRange("2026-10-11", "23:30")).toBe(
      "20261011T233000/20261012T003000"
    )
  })

  it("keeps unscheduled-time calendar entries as all-day events", () => {
    expect(getCalendarDateRange("2026-10-11", null)).toBe(
      "20261011/20261012"
    )
  })

  it("formats database time values for display", () => {
    expect(formatServiceTime("09:00:00")).toMatch(/9:00/)
    expect(formatServiceTime(null)).toBeNull()
  })
})
