import { describe, expect, it } from "vitest"
import {
  buildChordProExport,
  getChordProDownloadName,
  MAX_CHORDPRO_FILE_BYTES,
  validateChordProImport,
} from "../../src/lib/chordpro-portability"

describe("ChordPro import validation", () => {
  it("accepts supported extensions with valid source", () => {
    expect(
      validateChordProImport(
        "song.CHOPRO",
        24,
        "{title: Song}\n[G]Lyrics"
      )
    ).toEqual({ valid: true, error: null })
  })

  it("rejects unsupported, oversized, empty, and malformed files", () => {
    expect(
      validateChordProImport("song.txt", 10, "[G]Lyrics").valid
    ).toBe(false)
    expect(
      validateChordProImport(
        "song.cho",
        MAX_CHORDPRO_FILE_BYTES + 1,
        "[G]Lyrics"
      ).error
    ).toBe("ChordPro files must be 500 KB or smaller.")
    expect(validateChordProImport("song.cho", 0, "  ").error).toBe(
      "The selected file is empty."
    )
    expect(
      validateChordProImport("song.cho", 10, "[G Lyrics").error
    ).toContain("unmatched chord brackets")
  })
})

describe("ChordPro export", () => {
  it("adds missing song metadata without duplicating existing directives", () => {
    expect(
      buildChordProExport(
        "{key: G}\r\n[G]Lyrics",
        "Amazing Grace",
        "John Newton"
      )
    ).toBe(
      "{title: Amazing Grace}\n{artist: John Newton}\n{key: G}\n[G]Lyrics\n"
    )

    expect(
      buildChordProExport(
        "{title: Existing}\n{artist: Writer}\n[G]Lyrics",
        "Song title",
        "Song artist"
      )
    ).toBe("{title: Existing}\n{artist: Writer}\n[G]Lyrics\n")
  })

  it("creates a safe ChordPro filename from the song title", () => {
    expect(getChordProDownloadName("  Great / Love  ")).toBe(
      "Great-Love.cho"
    )
    expect(getChordProDownloadName("♥️")).toBe("song.cho")
  })
})
