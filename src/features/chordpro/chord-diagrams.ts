export type ChordDiagram = {
  frets: readonly number[]
  fingers: readonly number[]
  baseFret?: number
}

type ChordShape = {
  suffix: string
  frets: readonly number[]
  fingers: readonly number[]
}

const OPEN_SHAPES: Record<string, ChordShape> = {
  C: { suffix: "", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  D: { suffix: "", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  E: { suffix: "", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  G: { suffix: "", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  A: { suffix: "", frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  F: { suffix: "", frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  B: { suffix: "", frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 3, 3, 3, 1] },
  "C:min": { suffix: "m", frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1] },
  "D:min": { suffix: "m", frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  "E:min": { suffix: "m", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  "G:min": { suffix: "m", frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1] },
  "A:min": { suffix: "m", frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  "B:min": { suffix: "m", frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1] },
  "C:7": { suffix: "7", frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  "D:7": { suffix: "7", frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  "E:7": { suffix: "7", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  "G:7": { suffix: "7", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  "A:7": { suffix: "7", frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  "C:maj7": { suffix: "maj7", frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  "D:maj7": { suffix: "maj7", frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 1, 1] },
  "E:maj7": { suffix: "maj7", frets: [0, 2, 1, 1, 0, 0], fingers: [0, 3, 1, 2, 0, 0] },
  "A:maj7": { suffix: "maj7", frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  "D:sus2": { suffix: "sus2", frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0] },
  "D:sus4": { suffix: "sus4", frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  "A:sus2": { suffix: "sus2", frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 2, 3, 0, 0] },
  "A:sus4": { suffix: "sus4", frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
}

const MOVABLE_SUFFIXES: Record<
  string,
  { e: readonly number[]; a: readonly number[] }
> = {
  "": { e: [0, 2, 2, 1, 0, 0], a: [-1, 0, 2, 2, 2, 0] },
  m: { e: [0, 2, 2, 0, 0, 0], a: [-1, 0, 2, 2, 1, 0] },
  "7": { e: [0, 2, 0, 1, 0, 0], a: [-1, 0, 2, 0, 2, 0] },
  maj7: { e: [0, 2, 1, 1, 0, 0], a: [-1, 0, 2, 1, 2, 0] },
  m7: { e: [0, 2, 0, 0, 0, 0], a: [-1, 0, 2, 0, 1, 0] },
}

const NOTE_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

function normalizeSuffix(suffix: string) {
  const normalized = suffix.trim().toLowerCase()

  if (["", "maj", "major", "M"].includes(suffix.trim())) return ""
  if (["m", "min", "-"].includes(normalized)) return "m"
  if (["7", "dom7"].includes(normalized)) return "7"
  if (["maj7", "ma7", "Δ7", "M7"].includes(suffix.trim())) return "maj7"
  if (["m7", "min7", "-7"].includes(normalized)) return "m7"
  if (["sus2", "sus4", "sus"].includes(normalized)) return normalized === "sus" ? "sus4" : normalized

  return null
}

function getMovableShape(root: string, suffix: string): ChordDiagram | null {
  const rootIndex = NOTE_INDEX[root]
  const forms = MOVABLE_SUFFIXES[suffix]

  if (rootIndex === undefined || !forms) return null

  const eFret = (rootIndex - 4 + 12) % 12

  if (eFret >= 1 && eFret <= 8) {
    return {
      baseFret: eFret,
      frets: forms.e.map((fret) => (fret < 0 ? fret : fret + eFret)),
      fingers: forms.e.map((fret, index) =>
        fret < 0 ? 0 : fret === 0 ? 1 : fret === 1 ? 2 : index === 1 ? 3 : 4
      ),
    }
  }

  const aRootFret = (rootIndex - 9 + 12) % 12

  if (aRootFret >= 1 && aRootFret <= 8) {
    return {
      baseFret: aRootFret,
      frets: forms.a.map((fret) => (fret < 0 ? fret : fret + aRootFret)),
      fingers: forms.a.map((fret, index) =>
        fret < 0 ? 0 : fret === 0 ? 1 : fret === 1 ? 2 : index === 2 ? 3 : 4
      ),
    }
  }

  return null
}

export function getChordDiagram(chord: string): ChordDiagram | null {
  const match = chord.trim().match(/^([A-G])([#b]?)([^/]*)?(?:\/([A-G][#b]?))?$/i)

  if (!match) return null

  const root = `${match[1]?.toUpperCase()}${match[2]}`
  const suffix = normalizeSuffix(match[3] ?? "")

  if (suffix === null) return null

  const exactShape = OPEN_SHAPES[`${root}:${suffix}`]
  const rootShape = OPEN_SHAPES[root]
  const shape = exactShape ?? (suffix === "" ? rootShape : undefined)

  if (shape) {
    return {
      frets: shape.frets,
      fingers: shape.fingers,
      baseFret: 1,
    }
  }

  if (MOVABLE_SUFFIXES[suffix]) {
    return getMovableShape(root, suffix)
  }

  return null
}

export function getChordRootLabel(chord: string) {
  return chord.trim().split("/")[0] ?? chord
}
