import { describe, expect, it } from "vitest"
import { formatServiceTime } from "@/lib/service-scheduling"

describe("service wall-clock formatting", () => {
  it("formats service times without relying on the server timezone", () => {
    expect(formatServiceTime("09:30")).toBe("9:30 AM")
    expect(formatServiceTime("13:05")).toBe("1:05 PM")
    expect(formatServiceTime("00:00")).toBe("12:00 AM")
    expect(formatServiceTime("23:59")).toBe("11:59 PM")
  })

  it("returns null for unset or malformed service times", () => {
    expect(formatServiceTime(null)).toBeNull()
    expect(formatServiceTime("25:00")).toBeNull()
  })
})
