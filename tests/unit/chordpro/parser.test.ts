import { describe, expect, it } from "vitest"
import {
  getChordProMetadata,
  parseChordPro,
  validateChordPro,
} from "../../../src/features/chordpro/parser"

describe("ChordPro parser", () => {
  it("parses song metadata", () => {
    const result = parseChordPro(
      `{title: Amazing Grace}
{artist: John Newton}
{key: G}

[G]Amazing grace`
    )

    expect(result.metadata.title).toBe("Amazing Grace")
    expect(result.metadata.artist).toBe("John Newton")
    expect(result.metadata.key).toBe("G")
  })

  it("parses chords and lyrics", () => {
    const result = parseChordPro("[G]Amazing [C]grace")

    expect(result.lines[0]).toEqual({
      type: "content",
      tokens: [
        {
          type: "chord",
          value: "G",
        },
        {
          type: "text",
          value: "Amazing ",
        },
        {
          type: "chord",
          value: "C",
        },
        {
          type: "text",
          value: "grace",
        },
      ],
    })
  })

  it("parses section directives", () => {
    const result = parseChordPro(
      `{start_of_verse}
[G]Amazing grace
{end_of_verse}`
    )

    expect(result.lines[0]).toEqual({
      type: "directive",
      name: "start_of_verse",
      value: null,
    })

    expect(result.lines[2]).toEqual({
      type: "directive",
      name: "end_of_verse",
      value: null,
    })
  })

  it("accepts square-bracket notation for section directives", () => {
    const result = parseChordPro(
      `[start_of_intro]\n[D] [D/F#] [G] [Bm] [A] [G]\n{end_of_intro}`
    )

    expect(result.lines[0]).toEqual({
      type: "directive",
      name: "start_of_intro",
      value: null,
    })
    expect(result.lines[1]).toEqual({
      type: "content",
      tokens: [
        { type: "chord", value: "D" },
        { type: "text", value: " " },
        { type: "chord", value: "D/F#" },
        { type: "text", value: " " },
        { type: "chord", value: "G" },
        { type: "text", value: " " },
        { type: "chord", value: "Bm" },
        { type: "text", value: " " },
        { type: "chord", value: "A" },
        { type: "text", value: " " },
        { type: "chord", value: "G" },
      ],
    })
    expect(result.lines[2]).toEqual({
      type: "directive",
      name: "end_of_intro",
      value: null,
    })
  })

  it("preserves blank lines", () => {
    const result = parseChordPro("Verse\n\nChorus")

    expect(result.lines[1]).toEqual({
      type: "blank",
    })
  })

  it("returns metadata through helper", () => {
    expect(
      getChordProMetadata("{key: Bb}", "key")
    ).toBe("Bb")
  })

  it("rejects malformed chord brackets", () => {
    const result = validateChordPro("[G]Amazing [Cgrace")

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      "Line 1 has unmatched chord brackets."
    )
  })

  it("rejects malformed directive braces", () => {
    const result = validateChordPro("{title: Amazing")

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      "Line 1 has unmatched directive braces."
    )
  })

  it("rejects malformed chord symbols and unsupported syntax", () => {
    const result = validateChordPro("[H#] [Cfoo] [G7/xyz]")
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("Line 1 has unsupported chord syntax: [H#].")
    expect(result.errors).toContain("Line 1 has unsupported chord syntax: [Cfoo].")
    expect(result.errors).toContain("Line 1 has unsupported chord syntax: [G7/xyz].")
  })

  it("accepts extensions, alterations, slash bass, and enharmonic symbols", () => {
    const result = validateChordPro("[Cmaj7] [Am7b5] [G7sus4] [D/F#] [Bb] [C♯m7] [C6/9] [C(b9)]")
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("accepts custom chord aliases declared with define directives", () => {
    const result = validateChordPro("{define: H base-fret 1 frets 0 2 2 1 0 0}\n[H]Custom chord")
    expect(result.valid).toBe(true)
  })

  it("accepts lyrics without chords", () => {
    const result = validateChordPro("Amazing grace how sweet the sound")

    expect(result.valid).toBe(true)
  })
})