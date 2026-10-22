import { describe, expect, it } from "vitest"
import { formatAudioTimestamp, parseAudioTimestamp } from "../../../src/features/chordpro/audio-timestamps"
import { buildSongDisplayLines } from "../../../src/features/chordpro/render"
import { parseChordPro } from "../../../src/features/chordpro/parser"

describe("audio timestamps", () => {
  it("parses seconds, minute-second, and hour-minute-second values", () => {
    expect(parseAudioTimestamp("34")).toBe(34)
    expect(parseAudioTimestamp("00:34")).toBe(34)
    expect(parseAudioTimestamp("1:02:03")).toBe(3723)
  })

  it("rejects invalid timestamp values", () => {
    expect(parseAudioTimestamp("1:60")).toBeNull()
    expect(parseAudioTimestamp("1:70:02")).toBeNull()
    expect(parseAudioTimestamp("-1")).toBeNull()
    expect(parseAudioTimestamp("nope")).toBeNull()
  })

  it("formats timestamps for accessible controls", () => {
    expect(formatAudioTimestamp(34)).toBe("0:34")
    expect(formatAudioTimestamp(3723)).toBe("1:02:03")
  })

  it("keeps audio timestamps, alignment, columns and tab blocks in display output", () => {
    const display = buildSongDisplayLines(parseChordPro(
      "{audio_timestamp: 00:34}\n{align: center}\n{columns: 2}\n{start_of_tab}\ne|--0--\n{end_of_tab}\n{column_break}\n{new_page}"
    ).lines)
    expect(display).toContainEqual({ type: "audio_timestamp", seconds: 34 })
    expect(display).toContainEqual({ type: "columns", count: 2 })
    expect(display).toContainEqual({ type: "content", line: { type: "content", tokens: [{ type: "text", value: "e|--0--" }] }, alignment: "center", preformatted: true })
    expect(display).toContainEqual({ type: "column_break" })
    expect(display).toContainEqual({ type: "new_page" })
  })
})
