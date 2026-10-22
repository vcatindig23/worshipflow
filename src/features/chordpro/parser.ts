import { isValidChordSymbol } from "./chord-symbols"
import { parseAudioTimestamp } from "./audio-timestamps"
import type {
  DirectiveLine,
  ParsedSong,
  SongLine,
  SongToken,
} from "./types"

const directivePattern = /^\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*(.*?))?\s*\}$/
const sectionDirectivePattern =
  /^\[(start_of|end_of)_(verse|chorus|bridge|pre_chorus|intro|outro|tag|interlude|tab|grid)\]$/i
const chordPattern = /\[([^\]]+)\]/g

const metadataDirectives = new Set([
  "title",
  "subtitle",
  "artist",
  "composer",
  "album",
  "key",
  "original_key",
  "current_key",
  "tempo",
  "time",
  "time_signature",
  "capo",
])

function normalizeDirectiveName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_")
}

function parseDirective(line: string): DirectiveLine | null {
  const match = line.match(directivePattern)

  if (match) {
    const name = normalizeDirectiveName(match[1] ?? "")
    const value = match[2] === undefined ? null : match[2].trim()

    return {
      type: "directive",
      name,
      value: value === "" ? null : value,
    }
  }

  const sectionMatch = line.match(sectionDirectivePattern)

  if (!sectionMatch) {
    return null
  }

  return {
    type: "directive",
    name: `${sectionMatch[1]}_${sectionMatch[2]}`.toLowerCase(),
    value: null,
  }
}

function parseContentLine(line: string): SongLine {
  const tokens: SongToken[] = []
  let lastIndex = 0

  for (const match of line.matchAll(chordPattern)) {
    const index = match.index ?? 0
    const chord = match[1]?.trim()

    if (!chord) {
      continue
    }

    if (index > lastIndex) {
      tokens.push({
        type: "text",
        value: line.slice(lastIndex, index),
      })
    }

    tokens.push({
      type: "chord",
      value: chord,
    })

    lastIndex = index + match[0].length
  }

  if (lastIndex < line.length) {
    tokens.push({
      type: "text",
      value: line.slice(lastIndex),
    })
  }

  if (tokens.length === 0) {
    tokens.push({
      type: "text",
      value: line,
    })
  }

  return {
    type: "content",
    tokens,
  }
}

export function parseChordPro(source: string): ParsedSong {
  const normalizedSource = source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

  const metadata: Record<string, string> = {}
  const lines: SongLine[] = []

  for (const rawLine of normalizedSource.split("\n")) {
    const line = rawLine.trimEnd()

    if (line.trim() === "") {
      lines.push({
        type: "blank",
      })
      continue
    }

    const directive = parseDirective(line)

    if (directive) {
      if (
        directive.value !== null &&
        metadataDirectives.has(directive.name)
      ) {
        metadata[directive.name] = directive.value
      }

      lines.push(directive)
      continue
    }

    lines.push(parseContentLine(line))
  }

  return {
    metadata,
    lines,
  }
}

export function getChordProMetadata(
  source: string,
  key: string
): string | undefined {
  const parsed = parseChordPro(source)
  return parsed.metadata[normalizeDirectiveName(key)]
}

export function validateChordPro(source: string) {
  const errors: string[] = []

  if (source.length > 500000) {
    errors.push("Song source must not exceed 500,000 characters.")
  }

  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const customChordNames = new Set<string>()

  for (const line of lines) {
    const definition = line.match(/^\{\s*define\s*:\s*([A-Za-z][A-Za-z0-9_-]*)\b/i)
    if (definition?.[1]) customChordNames.add(definition[1])
  }

  lines.forEach((line, index) => {
    const openingBrackets = (line.match(/\[/g) ?? []).length
    const closingBrackets = (line.match(/\]/g) ?? []).length
    if (openingBrackets !== closingBrackets) {
      errors.push("Line " + (index + 1) + " has unmatched chord brackets.")
    }

    const openingBraces = (line.match(/\{/g) ?? []).length
    const closingBraces = (line.match(/\}/g) ?? []).length
    if (openingBraces !== closingBraces) {
      errors.push("Line " + (index + 1) + " has unmatched directive braces.")
    }

    const directive = parseDirective(line)
    if (directive?.name === "audio_timestamp") {
      if (directive.value === null || parseAudioTimestamp(directive.value) === null) {
        errors.push("Line " + (index + 1) + " has an invalid audio timestamp. Use seconds, M:SS, or H:MM:SS.")
      }
      return
    }

    if (directive && (directive.name === "align" || directive.name === "text_align")) {
      if (!["left", "center", "right"].includes((directive.value ?? "").toLowerCase())) {
        errors.push("Line " + (index + 1) + " has an invalid alignment directive. Use left, center, or right.")
      }
      return
    }

    if (directive?.name === "columns") {
      if (!["1", "2"].includes(directive.value ?? "")) {
        errors.push("Line " + (index + 1) + " has an invalid columns directive. Use 1 or 2.")
      }
      return
    }

    if (sectionDirectivePattern.test(line.trim())) return

    for (const match of line.matchAll(chordPattern)) {
      const chord = match[1]?.trim() ?? ""
      if (!chord) {
        errors.push("Line " + (index + 1) + " contains an empty chord symbol.")
        continue
      }

      const customChord = /^[A-Za-z][A-Za-z0-9_-]*$/.test(chord) && customChordNames.has(chord)
      if (!customChord && !isValidChordSymbol(chord)) {
        errors.push("Line " + (index + 1) + " has unsupported chord syntax: [" + chord + "].")
      }
    }
  })

  return { valid: errors.length === 0, errors }
}