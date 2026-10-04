import type { SongLine } from "./types"

export type RenderedSongSection = {
  type: "section" | "content" | "blank"
  title?: string
  line?: SongLine
}

const sectionNames: Record<string, string> = {
  start_of_verse: "Verse",
  start_of_chorus: "Chorus",
  start_of_bridge: "Bridge",
  start_of_pre_chorus: "Pre-Chorus",
  start_of_intro: "Intro",
  start_of_outro: "Outro",
  start_of_tag: "Tag",
  start_of_interlude: "Interlude",
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
])

export function buildSongDisplayLines(
  lines: SongLine[]
): RenderedSongSection[] {
  const result: RenderedSongSection[] = []

  for (const line of lines) {
    if (line.type === "blank") {
      result.push({
        type: "blank",
      })
      continue
    }

    if (line.type === "directive") {
      const sectionTitle = sectionNames[line.name]

      if (sectionTitle) {
        result.push({
          type: "section",
          title: sectionTitle,
        })

        continue
      }

      if (endDirectives.has(line.name)) {
        continue
      }

      if (
        line.name === "column_break" ||
        line.name === "new_page" ||
        line.name === "comment"
      ) {
        continue
      }

      continue
    }

    result.push({
      type: "content",
      line,
    })
  }

  return result
}