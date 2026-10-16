import { describe, expect, it } from "vitest"
import {
  clampPracticeTempo,
  estimateTapTempo,
} from "../../src/lib/practice-tempo"

describe("practice tempo helpers", () => {
  it("uses a sensible default when the saved tempo is missing or invalid", () => {
    expect(clampPracticeTempo(null)).toBe(80)
    expect(clampPracticeTempo(Number.NaN)).toBe(80)
  })

  it("keeps tempo inside the supported practice range", () => {
    expect(clampPracticeTempo(20)).toBe(40)
    expect(clampPracticeTempo(221)).toBe(220)
    expect(clampPracticeTempo(119.6)).toBe(120)
  })

  it("estimates tempo from recent evenly spaced taps", () => {
    expect(estimateTapTempo([0, 500, 1000, 1500])).toBe(120)
    expect(estimateTapTempo([0, 750, 1500])).toBe(80)
  })

  it("ignores invalid tap intervals and requires at least two usable taps", () => {
    expect(estimateTapTempo([1000])).toBeNull()
    expect(estimateTapTempo([0, 50, 100])).toBeNull()
    expect(estimateTapTempo([0, 500, 3500])).toBe(120)
  })

  it("uses the median interval to reduce the effect of missed taps", () => {
    expect(estimateTapTempo([0, 500, 1000, 2300, 2800])).toBe(120)
  })
})
