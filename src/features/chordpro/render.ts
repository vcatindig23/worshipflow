import type { SongLine } from "./types"
import { parseAudioTimestamp } from "./audio-timestamps"

export type SongAlignment = "left" | "center" | "right"

export type RenderedSongSection =
  | { type: "section"; title: string }
  | { type: "content"; line: SongLine; alignment: SongAlignment; preformatted: boolean }
  | { type: "blank" }
  | { type: "audio_timestamp"; seconds: number }
  | { type: "column_break" }
  | { type: "new_page" }
  | { type: "columns"; count: 1 | 2 }

const sectionNames: Record<string, string> = {
  start_of_verse: "Verse",
  start_of_chorus: "Chorus",
  start_of_bridge: "Bridge",
  start_of_pre_chorus: "Pre-Chorus",
  start_of_intro: "Intro",
  start_of_outro: "Outro",
  start_of_tag: "Tag",
  start_of_interlude: "Interlude",
  start_of_tab: "Tab",
  start_of_grid: "Chord Grid",
}

const endDirectives = new Set([
  "end_of_verse",
  "end_of_chorus",
  "end_of_bridge",
  "end_of_pre_chorus",
  "end_of_intro",
  "end_of_outro",
  "end_of_tag",
  "end_of_interlude",
  "end_of_tab",
  "end_of_grid",
])

function getSectionTitle(name: string) {
  const match = name.match(
    /^start_of_(verse|chorus|bridge|pre_chorus|intro|outro|tag|interlude|tab|grid)(?:_(\d+))?$/
  )
  if (!match) return null

  const title = sectionNames[`start_of_${match[1]}`]
  return title ? `${title}${match[2] ? ` ${match[2]}` : ""}` : null
}

function isEndDirective(name: string) {
  return endDirectives.has(name) ||
    /^end_of_(verse|chorus|bridge|pre_chorus|intro|outro|tag|interlude|tab|grid)(?:_\d+)?$/.test(name)
}

export function buildSongDisplayLines(lines: SongLine[]): RenderedSongSection[] {
  const result: RenderedSongSection[] = []
  let alignment: SongAlignment = "left"
  let preformatted = false

  for (const line of lines) {
    if (line.type === "blank") {
      result.push({ type: "blank" })
      continue
    }

    if (line.type === "directive") {
      const sectionTitle = getSectionTitle(line.name)
      if (sectionTitle) {
        if (line.name === "start_of_tab" || line.name === "start_of_grid") {
          preformatted = true
        }
        result.push({ type: "section", title: sectionTitle })
        continue
      }

      if (isEndDirective(line.name)) {
        if (line.name === "end_of_tab" || line.name === "end_of_grid") {
          preformatted = false
        }
        continue
      }

      if (line.name === "audio_timestamp" && line.value !== null) {
        const seconds = parseAudioTimestamp(line.value)
        if (seconds !== null) result.push({ type: "audio_timestamp", seconds })
        continue
      }

      if (line.name === "align" || line.name === "text_align") {
        const value = line.value?.toLowerCase()
        if (value === "left" || value === "center" || value === "right") alignment = value
        continue
      }

      if (line.name === "columns") {
        if (line.value === "1" || line.value === "2") {
          result.push({ type: "columns", count: Number(line.value) as 1 | 2 })
        }
        continue
      }

      if (line.name === "column_break") {
        result.push({ type: "column_break" })
        continue
      }

      if (line.name === "new_page") {
        result.push({ type: "new_page" })
        continue
      }

      // Metadata, comments and custom chord definitions are not displayed as lyrics.
      continue
    }

    result.push({ type: "content", line, alignment, preformatted })
  }

  return result
}
