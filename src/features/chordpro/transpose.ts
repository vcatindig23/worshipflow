const SHARP_NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const

const FLAT_NOTES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  "E#": 5,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const chordPattern = /^([A-Ga-g])([#b]?)(.*)$/

function getNoteIndex(root: string) {
  const normalized = `${root.charAt(0).toUpperCase()}${root.charAt(1) ?? ""}`
  return NOTE_INDEX[normalized]
}

export function getTranspositionBetweenKeys(
  fromKey: string | null | undefined,
  toKey: string | null | undefined
) {
  const fromMatch = fromKey?.match(/^([A-Ga-g])([#b]?)/)
  const toMatch = toKey?.match(/^([A-Ga-g])([#b]?)/)

  if (!fromMatch || !toMatch) {
    return null
  }

  const fromIndex = getNoteIndex(`${fromMatch[1]}${fromMatch[2]}`)
  const toIndex = getNoteIndex(`${toMatch[1]}${toMatch[2]}`)

  if (fromIndex === undefined || toIndex === undefined) {
    return null
  }

  const semitones = ((toIndex - fromIndex + 12) % 12)

  return semitones > 6 ? semitones - 12 : semitones
}

function formatNote(index: number, preferFlats: boolean) {
  const normalizedIndex = ((index % 12) + 12) % 12

  return preferFlats
    ? FLAT_NOTES[normalizedIndex]
    : SHARP_NOTES[normalizedIndex]
}

function transposeRoot(root: string, semitones: number) {
  const noteIndex = getNoteIndex(root)

  if (noteIndex === undefined) {
    return root
  }

  return formatNote(noteIndex + semitones, root.includes("b"))
}

export function transposeChord(chord: string, semitones: number) {
  const value = chord.trim()

  if (!value) {
    return chord
  }

  const match = value.match(chordPattern)

  if (!match) {
    return chord
  }

  const root = `${match[1]}${match[2]}`
  const suffix = match[3] ?? ""
  const slashIndex = suffix.indexOf("/")

  if (slashIndex === -1) {
    return `${transposeRoot(root, semitones)}${suffix}`
  }

  const chordSuffix = suffix.slice(0, slashIndex)
  const bass = suffix.slice(slashIndex + 1)

  if (!bass) {
    return `${transposeRoot(root, semitones)}${chordSuffix}/`
  }

  const bassMatch = bass.match(/^([A-Ga-g])([#b]?)(.*)$/)

  if (!bassMatch) {
    return `${transposeRoot(root, semitones)}${chordSuffix}/${bass}`
  }

  const bassRoot = `${bassMatch[1]}${bassMatch[2]}`
  const bassSuffix = bassMatch[3] ?? ""

  return `${transposeRoot(root, semitones)}${chordSuffix}/${transposeRoot(
    bassRoot,
    semitones
  )}${bassSuffix}`
}

export function transposeChordProSource(
  source: string,
  semitones: number
) {
  if (!Number.isInteger(semitones)) {
    throw new Error("Transpose amount must be an integer.")
  }

  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const directiveMatch = line.match(
        /^\{\s*([a-zA-Z0-9_]+)(?:\s*:\s*(.*?))?\s*\}$/
      )

      if (directiveMatch) {
        const originalName = directiveMatch[1] ?? ""
        const normalizedName = originalName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "_")

        const value = directiveMatch[2]?.trim() ?? ""

        if (
          normalizedName === "key" ||
          normalizedName === "original_key" ||
          normalizedName === "current_key"
        ) {
          return `{${originalName}: ${transposeChord(
            value,
            semitones
          )}}`
        }

        return line
      }

      return line.replace(/\[([^\]]+)\]/g, (_, chord: string) => {
        return `[${transposeChord(chord, semitones)}]`
      })
    })
    .join("\n")
}