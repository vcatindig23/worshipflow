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

  it("accepts lyrics without chords", () => {
    const result = validateChordPro("Amazing grace how sweet the sound")

    expect(result.valid).toBe(true)
  })
})