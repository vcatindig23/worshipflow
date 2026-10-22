import { describe, expect, it } from "vitest"
import { compareChordProSources } from "../../../src/features/chordpro/compare"

describe("ChordPro source comparison", () => {
  it("detects changed lyrics and chords while preserving line positions", () => {
    expect(compareChordProSources("[G]Amazing grace\n[C]How sweet", "[G]Amazing grace\n[D]How sweet")).toEqual([
      { lineNumber: 1, current: "[G]Amazing grace", previous: "[G]Amazing grace", status: "same" },
      { lineNumber: 2, current: "[C]How sweet", previous: "[D]How sweet", status: "changed" },
    ])
  })

  it("marks lines added to the current arrangement", () => {
    expect(compareChordProSources("Verse\nChorus\nBridge", "Verse\nChorus")[2]).toEqual({
      lineNumber: 3, current: "Bridge", previous: "", status: "current-only",
    })
  })

  it("normalizes Windows line endings", () => {
    expect(compareChordProSources("A\r\nB", "A\nB").every((line) => line.status === "same")).toBe(true)
  })
})
