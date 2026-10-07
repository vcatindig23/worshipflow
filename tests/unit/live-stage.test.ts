import { describe, expect, it } from "vitest"
import {
  getBoundedStageIndex,
  parseStageSongIndex,
} from "../../src/lib/live-stage"
import { getTranspositionBetweenKeys } from "../../src/features/chordpro/transpose"

describe("live stage navigation", () => {
  it("moves within the setlist without wrapping at either end", () => {
    expect(getBoundedStageIndex(0, -1, 3)).toBe(0)
    expect(getBoundedStageIndex(0, 1, 3)).toBe(1)
    expect(getBoundedStageIndex(2, 1, 3)).toBe(2)
  })

  it("returns null for an empty setlist", () => {
    expect(getBoundedStageIndex(0, 1, 0)).toBeNull()
  })

  it("accepts only bounded non-negative integer song indices", () => {
    expect(parseStageSongIndex("0")).toBe(0)
    expect(parseStageSongIndex("999")).toBe(999)
    expect(parseStageSongIndex("-1")).toBeNull()
    expect(parseStageSongIndex("1.5")).toBeNull()
    expect(parseStageSongIndex("1000")).toBeNull()
    expect(parseStageSongIndex("9007199254740992")).toBeNull()
    expect(parseStageSongIndex("song")).toBeNull()
  })
})

describe("setlist key transposition", () => {
  it("calculates the shortest semitone offset to a setlist key override", () => {
    expect(getTranspositionBetweenKeys("G", "A")).toBe(2)
    expect(getTranspositionBetweenKeys("Bb", "A")).toBe(-1)
    expect(getTranspositionBetweenKeys("C", "F#")).toBe(6)
  })

  it("returns null when either key is not recognizable", () => {
    expect(getTranspositionBetweenKeys("", "A")).toBeNull()
    expect(getTranspositionBetweenKeys("G", null)).toBeNull()
  })
})
