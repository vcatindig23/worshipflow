import { describe, expect, it } from "vitest"
import {
  normalizeGlobalSearchQuery,
  toSearchPattern,
  splitSearchHighlights,
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

describe("global search highlighting", () => {
  it("highlights multiple query terms without changing unmatched text", () => {
    expect(splitSearchHighlights("Amazing Grace (My Chains Are Gone)", "amazing gone")).toEqual([
      { text: "Amazing", match: true },
      { text: " Grace (My Chains Are ", match: false },
      { text: "Gone", match: true },
      { text: ")", match: false },
    ])
  })

  it("treats query punctuation literally and ignores empty terms", () => {
    expect(splitSearchHighlights("100% Ready", "  100%   ")).toEqual([
      { text: "100%", match: true },
      { text: " Ready", match: false },
    ])
    expect(splitSearchHighlights("Untouched", "   ")).toEqual([
      { text: "Untouched", match: false },
    ])
  })
})
