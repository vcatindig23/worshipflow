import guitarPositionData from "./guitar-positions.json"

export const GUITAR_STRING_OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const
export const GUITAR_STRING_NAMES = ["E", "A", "D", "G", "B", "e"] as const

export type GuitarNote = {
  stringIndex: number
  fret: number
  midi: number
  pitchClass: number
  finger: number
}

export type GuitarShape = {
  frets: (number | null)[]
  fingers: number[]
  notes: GuitarNote[]
  bassPitchClass: number
  minFret: number
  span: number
  barres: number[]
  reference: boolean
}

type StoredGuitarPosition = {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
}

type StoredPositionData = {
  _attribution: string
  positions: Record<string, Record<string, StoredGuitarPosition[]>>
}

const storedPositions = guitarPositionData as StoredPositionData

const DATABASE_SUFFIX_BY_TYPE: Record<string, string> = {
  major: "major",
  minor: "minor",
  power: "5",
  sus2: "sus2",
  sus4: "sus4",
  diminished: "dim",
  "diminished-seven": "dim7",
  augmented: "aug",
  sixth: "6",
  "minor-sixth": "m6",
  "six-nine": "69",
  "minor-six-nine": "m69",
  "dominant-seven": "7",
  "major-seven": "maj7",
  "minor-seven": "m7",
  "minor-major-seven": "mmaj7",
  "half-diminished": "m7b5",
  "seven-flat-five": "7b5",
  "seven-sharp-five": "aug7",
  "augmented-seven": "aug7",
  "seven-sus-four": "7sus4",
  "add-nine": "add9",
  "minor-add-nine": "madd9",
  nine: "9",
  "major-nine": "maj9",
  "minor-nine": "m9",
  "minor-major-nine": "mmaj9",
  eleven: "11",
  "major-eleven": "maj11",
  "minor-eleven": "m11",
  thirteen: "13",
  "major-thirteen": "maj13",
  "seven-flat-nine": "7b9",
  "seven-sharp-nine": "7#9",
  "nine-sharp-five": "aug9",
  "nine-flat-five": "9b5",
  "nine-sharp-eleven": "9#11",
  "major-seven-sharp-five": "maj7#5",
}

const STRING_COUNT = GUITAR_STRING_OPEN_MIDI.length

function chordPitchClasses(root: number, intervals: number[]) {
  return new Set(intervals.map((interval) => (root + interval) % 12))
}

function requiredThirdOrSuspension(root: number, intervals: number[]) {
  const chordOrder = Array.from(
    new Set(intervals.map((interval) => (root + interval) % 12))
  )
  const candidatePitchClasses = new Set([
    (root + 3) % 12,
    (root + 4) % 12,
    (root + 2) % 12,
    (root + 5) % 12,
  ])
  return chordOrder.find((pitchClass) =>
    candidatePitchClasses.has(pitchClass)
  )
}

function makeShape(
  frets: (number | null)[],
  fingers: number[],
  root: number,
  intervals: number[],
  barres: number[],
  reference: boolean
): GuitarShape | null {
  const chordTones = chordPitchClasses(root, intervals)
  const notes: GuitarNote[] = []

  frets.forEach((fret, stringIndex) => {
    if (fret === null) return
    const midi = GUITAR_STRING_OPEN_MIDI[stringIndex] + fret
    notes.push({
      stringIndex,
      fret,
      midi,
      pitchClass: midi % 12,
      finger: fingers[stringIndex] ?? 0,
    })
  })

  const uniqueTones = new Set(notes.map((note) => note.pitchClass))
  const minimumNotes = chordTones.size <= 2 ? 2 : 3
  if (
    notes.length < minimumNotes ||
    !uniqueTones.has(root) ||
    notes.some((note) => !chordTones.has(note.pitchClass))
  ) {
    return null
  }

  const requiredTone = requiredThirdOrSuspension(root, intervals)
  if (requiredTone !== undefined && !uniqueTones.has(requiredTone)) {
    return null
  }

  const playedFrets = frets.filter(
    (fret): fret is number => fret !== null && fret > 0
  )
  const minFret = playedFrets.length ? Math.min(...playedFrets) : 0
  const maxFret = playedFrets.length ? Math.max(...playedFrets) : 0
  const span = maxFret - minFret
  if (span > 4) return null

  const bass = notes.reduce(
    (lowest, note) => (note.midi < lowest.midi ? note : lowest),
    notes[0]
  )

  return {
    frets,
    fingers,
    notes,
    bassPitchClass: bass.pitchClass,
    minFret,
    span,
    barres,
    reference,
  }
}

function shapeFromStoredPosition(
  position: StoredGuitarPosition,
  root: number,
  intervals: number[]
): GuitarShape | null {
  const baseFret = position.baseFret || 1
  const frets = position.frets.map((fret) => {
    if (fret < 0) return null
    if (fret === 0) return 0
    return baseFret + fret - 1
  })
  const barres = position.barres.map((fret) => baseFret + fret - 1)

  return makeShape(
    frets,
    position.fingers,
    root,
    intervals,
    barres,
    true
  )
}

function selectUsefulShapes(
  shapes: GuitarShape[],
  root: number,
  intervals: number[]
) {
  const chordOrder = Array.from(
    new Set(intervals.map((interval) => (root + interval) % 12))
  )
  const bassRank = (pitchClass: number) => {
    const rank = chordOrder.indexOf(pitchClass)
    return rank < 0 ? Number.MAX_SAFE_INTEGER : rank
  }
  const sorted = [...shapes].sort((a, b) => {
    return (
      bassRank(a.bassPitchClass) - bassRank(b.bassPitchClass) ||
      a.minFret - b.minFret ||
      a.span - b.span ||
      b.notes.length - a.notes.length
    )
  })

  const selected: GuitarShape[] = []
  const usedBass = new Set<number>()

  for (const shape of sorted) {
    if (usedBass.has(shape.bassPitchClass)) continue
    selected.push(shape)
    usedBass.add(shape.bassPitchClass)
    if (selected.length === 5) return selected
  }

  for (const shape of sorted) {
    const alreadySelected = selected.some(
      (item) => item.frets.join(",") === shape.frets.join(",")
    )
    if (alreadySelected) continue
    selected.push(shape)
    if (selected.length === 5) break
  }

  return selected
}

function generateFallbackShapes(
  root: number,
  intervals: number[]
): GuitarShape[] {
  const tones = chordPitchClasses(root, intervals)
  const seen = new Set<string>()
  const candidates: GuitarShape[] = []
  const frets: (number | null)[] = Array(STRING_COUNT).fill(null)
  const fingers = Array(STRING_COUNT).fill(0)
  const windows = [
    { start: 1, end: 4 },
    { start: 4, end: 8 },
    { start: 8, end: 12 },
    { start: 12, end: 15 },
  ]

  function visit(stringIndex: number, start: number, end: number) {
    if (stringIndex === STRING_COUNT) {
      const key = frets.map((fret) => fret === null ? "x" : fret).join("-")
      if (seen.has(key)) return
      const shape = makeShape(
        [...frets],
        [...fingers],
        root,
        intervals,
        [],
        false
      )
      if (!shape) return
      seen.add(key)
      candidates.push(shape)
      return
    }

    frets[stringIndex] = null
    visit(stringIndex + 1, start, end)

    if (start === 1 && tones.has(GUITAR_STRING_OPEN_MIDI[stringIndex] % 12)) {
      frets[stringIndex] = 0
      visit(stringIndex + 1, start, end)
    }

    for (let fret = start; fret <= end; fret++) {
      const pitchClass = (GUITAR_STRING_OPEN_MIDI[stringIndex] + fret) % 12
      if (!tones.has(pitchClass)) continue

      const previousFrets = frets.filter(
        (value): value is number => value !== null && value > 0
      )
      if (previousFrets.length) {
        const nextMin = Math.min(...previousFrets, fret)
        const nextMax = Math.max(...previousFrets, fret)
        if (nextMax - nextMin > 4) continue
      }

      frets[stringIndex] = fret
      visit(stringIndex + 1, start, end)
    }

    frets[stringIndex] = null
  }

  for (const window of windows) {
    visit(0, window.start, window.end)
  }

  return selectUsefulShapes(candidates, root, intervals)
}

export function generateGuitarShapes(
  root: number,
  intervals: number[],
  chordTypeId: string
): GuitarShape[] {
  const suffix = DATABASE_SUFFIX_BY_TYPE[chordTypeId]
  const sourcePositions = suffix
    ? storedPositions.positions[String(root)]?.[suffix] ?? []
    : []

  const referenceShapes = sourcePositions
    .map((position) => shapeFromStoredPosition(position, root, intervals))
    .filter((shape): shape is GuitarShape => shape !== null)

  if (referenceShapes.length > 0) {
    return selectUsefulShapes(referenceShapes, root, intervals)
  }

  return generateFallbackShapes(root, intervals)
}
