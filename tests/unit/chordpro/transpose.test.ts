import { describe, expect, it } from "vitest"
import {
  transposeChord,
  transposeChordProSource,
} from "../../../src/features/chordpro/transpose"

describe("Chord transposition", () => {
  it("transposes major chords", () => {
    expect(transposeChord("C", 2)).toBe("D")
    expect(transposeChord("G", 2)).toBe("A")
  })

  it("transposes minor chords", () => {
    expect(transposeChord("Am", 2)).toBe("Bm")
  })

  it("transposes seventh chords", () => {
    expect(transposeChord("G7", 2)).toBe("A7")
  })

  it("transposes slash chords", () => {
    expect(transposeChord("C/E", 2)).toBe("D/F#")
  })

  it("preserves chord extensions", () => {
    expect(transposeChord("Am7b5", 2)).toBe("Bm7b5")
    expect(transposeChord("G7sus4", 2)).toBe("A7sus4")
  })

  it("handles flat chords", () => {
    expect(transposeChord("Bb", 2)).toBe("C")
  })

  it("handles negative values", () => {
    expect(transposeChord("D", -2)).toBe("C")
  })

  it("leaves unsupported text unchanged", () => {
    expect(transposeChord("NotAChord", 2)).toBe("NotAChord")
  })

  it("transposes an entire ChordPro document", () => {
    const source = `{title: Amazing Grace}
{key: G}

[G]Amazing [C]grace
That [D]saved a [G]wretch`

    const result = transposeChordProSource(source, 2)

    expect(result).toBe(`{title: Amazing Grace}
{key: A}

[A]Amazing [D]grace
That [E]saved a [A]wretch`)
  })

  it("rejects decimal transpose values", () => {
    expect(() =>
      transposeChordProSource("[G]Hello", 1.5)
    ).toThrow("Transpose amount must be an integer.")
  })
})