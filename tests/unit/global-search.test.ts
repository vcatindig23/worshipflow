import { describe, expect, it } from "vitest"
import {
  normalizeGlobalSearchQuery,
  toSearchPattern,
} from "../../src/lib/global-search"

describe("global search query helpers", () => {
  it("trims whitespace and handles missing input", () => {
    expect(normalizeGlobalSearchQuery("  Amazing Grace  ")).toBe(
      "Amazing Grace"
    )
    expect(normalizeGlobalSearchQuery(undefined)).toBe("")
  })

  it("limits queries to 100 characters", () => {
    expect(normalizeGlobalSearchQuery("a".repeat(120))).toHaveLength(100)
  })

  it("escapes SQL LIKE wildcard characters", () => {
    expect(toSearchPattern("100%_ready\\")).toBe("%100\\%\\_ready\\\\%")
  })
})
