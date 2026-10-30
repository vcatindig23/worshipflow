import { describe, expect, it } from "vitest"
import {
  getAvailabilityForDate,
  getCalendarMonthCells,
  type AvailabilityCalendarEntry,
} from "../../src/lib/schedule-calendar"

const blockout: AvailabilityCalendarEntry = {
  id: "blockout-1",
  entry_type: "blockout",
  title: "Family trip",
  reason: "Out of town",
  starts_on: "2026-11-01",
  ends_on: "2026-11-03",
  weekdays: null,
  start_time: null,
  end_time: null,
  timezone: "Asia/Manila",
}

const recurring: AvailabilityCalendarEntry = {
  id: "weekly-1",
  entry_type: "recurring",
  title: "Sunday mornings",
  reason: null,
  starts_on: null,
  ends_on: null,
  weekdays: [0],
  start_time: "08:00:00",
  end_time: "12:00:00",
  timezone: "Asia/Manila",
}

describe("schedule calendar helpers", () => {
  it("builds a Monday-first month grid with complete weeks", () => {
    const cells = getCalendarMonthCells(2026, 10)

    expect(cells.slice(0, 6)).toEqual([
      null, null, null, null, null, null,
    ])
    expect(cells[6]).toBe("2026-11-01")
    expect(cells).toHaveLength(35)
    expect(cells.at(-1)).toBe("2026-11-29")
  })

  it("builds six weeks when the month spans six calendar rows", () => {
    const cells = getCalendarMonthCells(2026, 7)
    expect(cells).toHaveLength(42)
    expect(cells[0]).toBe("2026-07-27")
    expect(cells[4]).toBe("2026-07-31")
    expect(cells[5]).toBe("2026-08-01")
  })

  it("marks every date in a blockout range, including both endpoints", () => {
    expect(getAvailabilityForDate([blockout], "2026-11-01").blockouts).toHaveLength(1)
    expect(getAvailabilityForDate([blockout], "2026-11-03").blockouts).toHaveLength(1)
    expect(getAvailabilityForDate([blockout], "2026-11-04").blockouts).toHaveLength(0)
  })

  it("shows recurring availability only on selected weekdays", () => {
    expect(getAvailabilityForDate([recurring], "2026-11-01").recurring).toHaveLength(1)
    expect(getAvailabilityForDate([recurring], "2026-11-02").recurring).toHaveLength(0)
  })

  it("returns all matching entries and orders recurring hours by start time", () => {
    const later: AvailabilityCalendarEntry = {
      ...recurring,
      id: "weekly-2",
      title: "Sunday afternoon",
      start_time: "13:00:00",
      end_time: "17:00:00",
    }
    const result = getAvailabilityForDate([later, recurring], "2026-11-01")

    expect(result.recurring.map((entry) => entry.id)).toEqual([
      recurring.id,
      later.id,
    ])
  })

  it("does not match malformed dates", () => {
    expect(getAvailabilityForDate([blockout, recurring], "2026-02-30")).toEqual({
      blockouts: [],
      recurring: [],
    })
  })
})
