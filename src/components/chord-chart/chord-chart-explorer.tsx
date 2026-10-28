"use client"

import { useMemo, useState } from "react"
import { AudioLines, Guitar, Piano, Volume2 } from "lucide-react"

type Instrument = "guitar" | "piano"
type ChordType = { id: string; label: string; suffix: string; group: string; intervals: number[] }

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]
const ROOT_OPTIONS = [
  { label: "C", value: 0 }, { label: "C♯ / D♭", value: 1 }, { label: "D", value: 2 },
  { label: "D♯ / E♭", value: 3 }, { label: "E", value: 4 }, { label: "F", value: 5 },
  { label: "F♯ / G♭", value: 6 }, { label: "G", value: 7 }, { label: "G♯ / A♭", value: 8 },
  { label: "A", value: 9 }, { label: "A♯ / B♭", value: 10 }, { label: "B", value: 11 },
]

const CHORD_TYPES: ChordType[] = [
  { id: "major", label: "Major", suffix: "", group: "Triads & basics", intervals: [0, 4, 7] },
  { id: "minor", label: "Minor", suffix: "m", group: "Triads & basics", intervals: [0, 3, 7] },
  { id: "power", label: "Power chord", suffix: "5", group: "Triads & basics", intervals: [0, 7] },
  { id: "sus2", label: "Suspended 2", suffix: "sus2", group: "Triads & basics", intervals: [0, 2, 7] },
  { id: "sus4", label: "Suspended 4", suffix: "sus4", group: "Triads & basics", intervals: [0, 5, 7] },
  { id: "diminished", label: "Diminished", suffix: "dim", group: "Triads & basics", intervals: [0, 3, 6] },
  { id: "augmented", label: "Augmented", suffix: "aug", group: "Triads & basics", intervals: [0, 4, 8] },
  { id: "sixth", label: "Major 6", suffix: "6", group: "Sixths & sevenths", intervals: [0, 4, 7, 9] },
  { id: "minor-sixth", label: "Minor 6", suffix: "m6", group: "Sixths & sevenths", intervals: [0, 3, 7, 9] },
  { id: "six-nine", label: "6/9", suffix: "6/9", group: "Sixths & sevenths", intervals: [0, 4, 7, 9, 14] },
  { id: "minor-six-nine", label: "Minor 6/9", suffix: "m6/9", group: "Sixths & sevenths", intervals: [0, 3, 7, 9, 14] },
  { id: "dominant-seven", label: "Dominant 7", suffix: "7", group: "Sixths & sevenths", intervals: [0, 4, 7, 10] },
  { id: "major-seven", label: "Major 7", suffix: "maj7", group: "Sixths & sevenths", intervals: [0, 4, 7, 11] },
  { id: "minor-seven", label: "Minor 7", suffix: "m7", group: "Sixths & sevenths", intervals: [0, 3, 7, 10] },
  { id: "minor-major-seven", label: "Minor-major 7", suffix: "mMaj7", group: "Sixths & sevenths", intervals: [0, 3, 7, 11] },
  { id: "diminished-seven", label: "Diminished 7", suffix: "dim7", group: "Sixths & sevenths", intervals: [0, 3, 6, 9] },
  { id: "half-diminished", label: "Half-diminished", suffix: "m7b5", group: "Sixths & sevenths", intervals: [0, 3, 6, 10] },
  { id: "augmented-seven", label: "Augmented 7", suffix: "aug7", group: "Sixths & sevenths", intervals: [0, 4, 8, 10] },
  { id: "seven-flat-five", label: "7♭5", suffix: "7b5", group: "Altered chords", intervals: [0, 4, 6, 10] },
  { id: "seven-sharp-five", label: "7♯5", suffix: "7#5", group: "Altered chords", intervals: [0, 4, 8, 10] },
  { id: "major-seven-sharp-five", label: "Major 7♯5", suffix: "maj7#5", group: "Altered chords", intervals: [0, 4, 8, 11] },
  { id: "seven-sus-four", label: "7sus4", suffix: "7sus4", group: "Suspended & added tones", intervals: [0, 5, 7, 10] },
  { id: "add-nine", label: "Add 9", suffix: "add9", group: "Suspended & added tones", intervals: [0, 4, 7, 14] },
  { id: "minor-add-nine", label: "Minor add 9", suffix: "madd9", group: "Suspended & added tones", intervals: [0, 3, 7, 14] },
  { id: "nine", label: "Dominant 9", suffix: "9", group: "Extended chords", intervals: [0, 4, 7, 10, 14] },
  { id: "major-nine", label: "Major 9", suffix: "maj9", group: "Extended chords", intervals: [0, 4, 7, 11, 14] },
  { id: "minor-nine", label: "Minor 9", suffix: "m9", group: "Extended chords", intervals: [0, 3, 7, 10, 14] },
  { id: "minor-major-nine", label: "Minor-major 9", suffix: "mMaj9", group: "Extended chords", intervals: [0, 3, 7, 11, 14] },
  { id: "eleven", label: "Dominant 11", suffix: "11", group: "Extended chords", intervals: [0, 4, 7, 10, 14, 17] },
  { id: "major-eleven", label: "Major 11", suffix: "maj11", group: "Extended chords", intervals: [0, 4, 7, 11, 14, 17] },
  { id: "minor-eleven", label: "Minor 11", suffix: "m11", group: "Extended chords", intervals: [0, 3, 7, 10, 14, 17] },
  { id: "thirteen", label: "Dominant 13", suffix: "13", group: "Extended chords", intervals: [0, 4, 7, 10, 14, 21] },
  { id: "major-thirteen", label: "Major 13", suffix: "maj13", group: "Extended chords", intervals: [0, 4, 7, 11, 14, 21] },
  { id: "minor-thirteen", label: "Minor 13", suffix: "m13", group: "Extended chords", intervals: [0, 3, 7, 10, 14, 21] },
  { id: "seven-flat-nine", label: "7♭9", suffix: "7b9", group: "Altered chords", intervals: [0, 4, 7, 10, 13] },
  { id: "seven-sharp-nine", label: "7♯9", suffix: "7#9", group: "Altered chords", intervals: [0, 4, 7, 10, 15] },
  { id: "nine-sharp-five", label: "9♯5", suffix: "9#5", group: "Altered chords", intervals: [0, 4, 8, 10, 14] },
  { id: "nine-flat-five", label: "9♭5", suffix: "9b5", group: "Altered chords", intervals: [0, 4, 6, 10, 14] },
  { id: "major-nine-sharp-five", label: "Major 9♯5", suffix: "maj9#5", group: "Altered chords", intervals: [0, 4, 8, 11, 14] },
  { id: "seven-sharp-eleven", label: "7♯11", suffix: "7#11", group: "Altered chords", intervals: [0, 4, 7, 10, 18] },
  { id: "major-seven-sharp-eleven", label: "Major 7♯11", suffix: "maj7#11", group: "Altered chords", intervals: [0, 4, 7, 11, 18] },
  { id: "nine-sharp-eleven", label: "9♯11", suffix: "9#11", group: "Altered chords", intervals: [0, 4, 7, 10, 14, 18] },
  { id: "seven-flat-thirteen", label: "7♭13", suffix: "7b13", group: "Altered chords", intervals: [0, 4, 7, 10, 20] },
  { id: "thirteen-flat-nine", label: "13♭9", suffix: "13b9", group: "Altered chords", intervals: [0, 4, 7, 10, 13, 21] },
  { id: "thirteen-sharp-eleven", label: "13♯11", suffix: "13#11", group: "Altered chords", intervals: [0, 4, 7, 10, 14, 18, 21] },
  { id: "seven-flat-nine-sharp-eleven", label: "7♭9♯11", suffix: "7b9#11", group: "Altered chords", intervals: [0, 4, 7, 10, 13, 18] },
  { id: "seven-flat-nine-sharp-five", label: "7♭9♯5", suffix: "7b9#5", group: "Altered chords", intervals: [0, 4, 8, 10, 13] },
  { id: "seven-sharp-nine-sharp-five", label: "7♯9♯5", suffix: "7#9#5", group: "Altered chords", intervals: [0, 4, 8, 10, 15] },
  { id: "minor-seven-add-eleven", label: "Minor 7 add 11", suffix: "m7add11", group: "Extended chords", intervals: [0, 3, 7, 10, 17] },
]

const CHORD_GROUPS = ["Triads & basics", "Sixths & sevenths", "Suspended & added tones", "Extended chords", "Altered chords"]
const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]
const WHITE_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]
const WHITE_KEY_WIDTH = 60
const PIANO_KEY_COUNT = 15
const PIANO_WIDTH = WHITE_KEY_WIDTH * PIANO_KEY_COUNT
const BLACK_KEY_WIDTH = 28

function getChordPitchClasses(root: number, intervals: number[]) {
  return new Set(intervals.map((interval) => (root + interval) % 12))
}

function playChordSample(root: number, intervals: number[], instrument: Instrument) {
  const context = new window.AudioContext()
  const startTime = context.currentTime + 0.04
  const baseMidi = (instrument === "guitar" ? 48 : 60) + root
  const uniqueIntervals = intervals.filter(
    (interval, index, values) => values.findIndex((candidate) => candidate % 12 === interval % 12) === index
  )
  const duration = instrument === "guitar" ? 1.12 : 1.38
  const master = context.createGain()
  master.gain.setValueAtTime(0.48, context.currentTime)
  master.connect(context.destination)

  if (context.state === "suspended") void context.resume()

  uniqueIntervals.slice(0, 7).forEach((interval, index) => {
    const noteStart = startTime + (instrument === "guitar" ? index * 0.025 : 0)
    const noteEnd = noteStart + duration
    const frequency = 440 * Math.pow(2, (baseMidi + interval - 69) / 12)
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = instrument === "guitar" ? "triangle" : "sine"
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    envelope.gain.setValueAtTime(0.0001, noteStart)
    envelope.gain.linearRampToValueAtTime(instrument === "guitar" ? 0.18 : 0.14, noteStart + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd)
    oscillator.connect(envelope)
    envelope.connect(master)
    oscillator.start(noteStart)
    oscillator.stop(noteEnd + 0.025)
  })

  window.setTimeout(() => void context.close(), 2200)
}

type GuitarNote = { stringIndex: number; fret: number; midi: number; pitchClass: number }
type GuitarShape = { frets: (number | null)[]; notes: GuitarNote[]; bassPitchClass: number; minFret: number; span: number }

const STRING_MIDI = [64, 59, 55, 50, 45, 40]
const STRING_NAMES = ["E", "B", "G", "D", "A", "E"]

function getChordOrder(root: number, intervals: number[]) {
  return Array.from(new Set(intervals.map((interval) => (root + interval) % 12)))
}

function getInversionName(root: number, bassPitchClass: number, chordOrder: number[]) {
  const index = chordOrder.indexOf(bassPitchClass)
  if (bassPitchClass === root || index <= 0) return "Root position"
  const suffixes = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"]
  return (suffixes[index] ?? (index + "th")) + " inversion"
}

function generateGuitarShapes(root: number, intervals: number[]): GuitarShape[] {
  const chordOrder = getChordOrder(root, intervals)
  const chordPitchClasses = new Set(chordOrder)
  const shapes: GuitarShape[] = []
  const seen = new Set<string>()
  const frets: (number | null)[] = Array(6).fill(null)

  function visit(stringIndex: number) {
    if (stringIndex === 6) {
      const notes: GuitarNote[] = []
      frets.forEach((fret, index) => {
        if (fret === null) return
        const midi = STRING_MIDI[index] + fret
        notes.push({ stringIndex: index, fret, midi, pitchClass: midi % 12 })
      })
      if (notes.length < 3) return
      const uniqueTones = new Set(notes.map((note) => note.pitchClass))
      if (!uniqueTones.has(root)) return
      const requiredThirdOrSuspension = chordOrder.find((tone) => tone === (root + 3) % 12 || tone === (root + 4) % 12 || tone === (root + 2) % 12 || tone === (root + 5) % 12)
      if (requiredThirdOrSuspension !== undefined && !uniqueTones.has(requiredThirdOrSuspension)) return
      const playedFrets = notes.map((note) => note.fret).filter((fret) => fret > 0)
      const minFret = playedFrets.length ? Math.min(...playedFrets) : 0
      const maxFret = playedFrets.length ? Math.max(...playedFrets) : 0
      if (maxFret - minFret > 4) return
      const key = frets.map((fret) => fret === null ? "x" : fret).join("-")
      if (seen.has(key)) return
      seen.add(key)
      const bass = notes.reduce((lowest, note) => note.midi < lowest.midi ? note : lowest, notes[0])
      shapes.push({ frets: [...frets], notes, bassPitchClass: bass.pitchClass, minFret, span: maxFret - minFret })
      return
    }

    frets[stringIndex] = null
    visit(stringIndex + 1)
    for (let fret = 0; fret <= 15; fret++) {
      const pitchClass = (STRING_MIDI[stringIndex] + fret) % 12
      if (!chordPitchClasses.has(pitchClass)) continue
      frets[stringIndex] = fret
      visit(stringIndex + 1)
    }
    frets[stringIndex] = null
  }

  visit(0)
  shapes.sort((a, b) => a.span - b.span || a.notes.length - b.notes.length || a.minFret - b.minFret)
  const selected: GuitarShape[] = []
  const usedBass = new Set<number>()
  for (const shape of shapes) {
    if (usedBass.has(shape.bassPitchClass)) continue
    selected.push(shape)
    usedBass.add(shape.bassPitchClass)
    if (selected.length === 5) break
  }
  if (selected.length < 5) {
    for (const shape of shapes) {
      if (selected.some((item) => item.frets.join(",") === shape.frets.join(","))) continue
      selected.push(shape)
      if (selected.length === 5) break
    }
  }
  return selected
}

function GuitarShapeDiagram({ shape, root, chordOrder, index, total }: { shape: GuitarShape; root: number; chordOrder: number[]; index: number; total: number }) {
  const left = 56
  const fretWidth = 46
  const top = 48
  const stringGap = 31
  const bottom = top + stringGap * 5
  const startFret = shape.minFret > 0 ? shape.minFret : 1
  const endFret = startFret + 4
  const width = left + fretWidth * 5 + 20
  const height = 242
  const playedNotes = shape.notes.map((note) => NOTE_NAMES[note.pitchClass]).join(" · ")
  const inversion = getInversionName(root, shape.bassPitchClass, chordOrder)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{inversion}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{total ? "Shape " + (index + 1) + " of " + total : "No shape found"} · Bass: {NOTE_NAMES[shape.bassPitchClass]}</p>
        </div>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-[var(--foreground)]">
          {shape.frets.slice().reverse().map((fret) => fret === null ? "×" : fret === 0 ? "0" : fret).join("  ")}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#fbfaf7] p-3">
        <svg role="img" aria-label={"Guitar chord shape " + (index + 1) + ": " + inversion + ". Frets shown for six strings."} viewBox={"0 0 " + width + " " + height} className="block w-full min-w-[300px] max-w-[430px]">
          <rect x={left} y={top - 10} width={fretWidth * 5} height={stringGap * 5 + 20} rx="3" fill="#e8d7b5" />
          {Array.from({ length: 6 }, (_, fretIndex) => {
            const fret = startFret - 1 + fretIndex
            const x = left + fretIndex * fretWidth
            return <g key={fret}><line x1={x} y1={top - 10} x2={x} y2={bottom + 10} stroke={fret === 0 ? "#6d6252" : "#b6a58b"} strokeWidth={fret === 0 ? 3 : 1.2} />{fretIndex < 5 ? <text x={x + fretWidth / 2} y="18" fill="#68645d" fontSize="11" textAnchor="middle">{fret + 1}</text> : null}</g>
          })}
          {STRING_MIDI.map((openMidi, stringIndex) => {
            const y = top + stringIndex * stringGap
            const fret = shape.frets[stringIndex]
            const note = shape.notes.find((item) => item.stringIndex === stringIndex)
            const inWindow = fret !== null && (fret === 0 || (fret >= startFret && fret <= endFret))
            const x = fret === 0 ? left - 17 : left + (fret! - startFret + 0.5) * fretWidth
            return <g key={stringIndex}>
              <text x="18" y={y + 4} fill="#68645d" fontSize="12" fontWeight="600" textAnchor="middle">{STRING_NAMES[stringIndex]}</text>
              <line x1={left} y1={y} x2={left + fretWidth * 5} y2={y} stroke="#7d7567" strokeWidth={2.3 - stringIndex * 0.2} />
              {fret === null ? <text x={left - 17} y={y + 4} fill="#9b493e" fontSize="14" fontWeight="700" textAnchor="middle">×</text> : fret === 0 ? <circle cx={left - 17} cy={y} r="5" fill="none" stroke="#817667" strokeWidth="1.5" /> : null}
              {note && inWindow ? <g><circle cx={x} cy={y} r="11" fill={note.pitchClass === root ? "var(--brand)" : "var(--brand-soft)"} stroke={note.pitchClass === root ? "var(--brand)" : "#cad7ca"} /><text x={x} y={y + 3.3} fill={note.pitchClass === root ? "#ffffff" : "#26352c"} fontSize="8.5" fontWeight="700" textAnchor="middle">{NOTE_NAMES[note.pitchClass]}</text></g> : null}
            </g>
          })}
          {shape.minFret > 1 ? <text x={left - 1} y={height - 10} fill="#68645d" fontSize="11">Fret {startFret}</text> : null}
        </svg>
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">Notes in this shape: {playedNotes}. Only the selected playable voicing is highlighted.</p>
    </div>
  )
}

function GuitarShapeSelector({ root, intervals }: { root: number; intervals: number[] }) {
  const shapes = useMemo(() => generateGuitarShapes(root, intervals), [root, intervals])
  const chordOrder = getChordOrder(root, intervals)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const safeIndex = Math.min(selectedIndex, Math.max(0, shapes.length - 1))
  const shape = shapes[safeIndex]

  if (!shape) return <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">No playable shape found for this chord within the first 15 frets. Try a simpler chord type.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" aria-label="Select guitar inversion or voicing">
        {shapes.map((item, index) => {
          const sameBassCount = shapes.slice(0, index).filter((previous) => previous.bassPitchClass === item.bassPitchClass).length
          const label = getInversionName(root, item.bassPitchClass, chordOrder) + (sameBassCount ? " · Voicing " + (sameBassCount + 1) : "")
          return <button key={item.frets.join("-")} type="button" onClick={() => setSelectedIndex(index)} aria-pressed={safeIndex === index} className={"rounded-lg border px-3 py-2 text-xs font-semibold transition " + (safeIndex === index ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]")}>{label}</button>
        })}
      </div>
      <GuitarShapeDiagram shape={shape} root={root} chordOrder={chordOrder} index={safeIndex} total={shapes.length} />
    </div>
  )
}

function getPianoVoicing(root: number, intervals: number[], inversionIndex: number) {
  const rootRelativeTones = Array.from(new Set(intervals.map((interval) => interval % 12))).sort((a, b) => a - b)
  const rotation = inversionIndex % rootRelativeTones.length
  const rotated = [
    ...rootRelativeTones.slice(rotation),
    ...rootRelativeTones.slice(0, rotation).map((interval) => interval + 12),
  ]
  return rotated.map((interval) => {
    const pitchClass = (root + interval) % 12
    let midi = 48 + root + interval
    while (midi > 72) midi -= 12
    while (midi < 48) midi += 12
    return { pitchClass, midi }
  }).filter((note, index, all) => all.findIndex((candidate) => candidate.midi === note.midi) === index)
}

function PianoKeyboard({ root, intervals, inversionIndex }: { root: number; intervals: number[]; inversionIndex: number }) {
  const whiteKeys = Array.from({ length: PIANO_KEY_COUNT }, (_, index) => {
    const noteIndex = index % 7
    const octave = 3 + Math.floor(index / 7)
    const pitchClass = WHITE_PITCH_CLASSES[noteIndex]
    const midi = 48 + (octave - 3) * 12 + pitchClass
    return { index, label: WHITE_NOTE_NAMES[noteIndex] + octave, pitchClass, midi, x: index * WHITE_KEY_WIDTH }
  })
  const blackNotes = [
    { pitchClass: 1, label: "C♯", afterWhite: 1, offset: 1 },
    { pitchClass: 3, label: "D♯", afterWhite: 2, offset: 3 },
    { pitchClass: 6, label: "F♯", afterWhite: 4, offset: 6 },
    { pitchClass: 8, label: "G♯", afterWhite: 5, offset: 8 },
    { pitchClass: 10, label: "A♯", afterWhite: 6, offset: 10 },
  ].flatMap((note) =>
    [0, 1].map((octaveIndex) => ({
      ...note,
      midi: 48 + octaveIndex * 12 + note.offset,
      x: (octaveIndex * 7 + note.afterWhite) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
      label: note.label + (3 + octaveIndex),
    }))
  )
  const voicing = getPianoVoicing(root, intervals, inversionIndex)
  const selectedMidis = new Set(voicing.map((note) => note.midi))
  const chordOrder = getChordOrder(root, intervals)
  const bass = voicing.reduce((lowest, note) => note.midi < lowest.midi ? note : lowest, voicing[0])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-[var(--foreground)]">{getInversionName(root, bass.pitchClass, chordOrder)}</p><p className="mt-1 text-xs text-[var(--muted)]">Selected voicing · lowest note {NOTE_NAMES[bass.pitchClass]}</p></div>
        <span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--foreground)]">{voicing.map((note) => NOTE_NAMES[note.pitchClass]).join(" · ")}</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#f8fafc] p-3">
        <svg role="img" aria-label={"Piano chord voicing in " + getInversionName(root, bass.pitchClass, chordOrder) + ", selected notes only."} viewBox={"0 0 " + PIANO_WIDTH + " 180"} className="block min-w-[680px] w-full">
          {whiteKeys.map((key) => {
            const selected = selectedMidis.has(key.midi)
            const isRoot = selected && key.pitchClass === root
            return <g key={key.label}><rect x={key.x} y="0" width={WHITE_KEY_WIDTH} height="164" rx="2" fill={isRoot ? "var(--brand)" : selected ? "var(--brand-soft)" : "#ffffff"} stroke="#b8c0c9" strokeWidth="1" />{selected ? <text x={key.x + WHITE_KEY_WIDTH / 2} y="151" fontSize="10" textAnchor="middle" fill={isRoot ? "#ffffff" : "#26352c"} fontWeight="700">{key.label}</text> : null}</g>
          })}
          {blackNotes.map((key) => {
            const selected = selectedMidis.has(key.midi)
            const isRoot = selected && key.pitchClass === root
            return <g key={key.label}><rect x={key.x} y="0" width={BLACK_KEY_WIDTH} height="105" rx="2" fill={isRoot ? "var(--brand)" : selected ? "var(--brand-soft)" : "#20242b"} stroke={selected ? "#d2ddd2" : "#111827"} strokeWidth="1" />{selected ? <text x={key.x + BLACK_KEY_WIDTH / 2} y="92" fontSize="8" textAnchor="middle" fill={isRoot ? "#ffffff" : "#26352c"} fontWeight="700">{key.label}</text> : null}</g>
          })}
        </svg>
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">Only the notes in this inversion are highlighted; unselected keys remain neutral.</p>
    </div>
  )
}

function ChordToneLegend() {
  return <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-[var(--brand)]" />Root note</span><span className="inline-flex items-center gap-2"><span className="size-3 rounded-full border border-[#cad7ca] bg-[var(--brand-soft)]" />Selected chord tone</span></div>
}

export default function ChordChartExplorer() {
  const [instrument, setInstrument] = useState<Instrument>("guitar")
  const [root, setRoot] = useState(0)
  const [qualityId, setQualityId] = useState("major")
  const [inversionIndex, setInversionIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)

  const quality = CHORD_TYPES.find((item) => item.id === qualityId) ?? CHORD_TYPES[0]
  const rootName = NOTE_NAMES[root]
  const chordSymbol = rootName + quality.suffix
  const pitchClasses = getChordPitchClasses(root, quality.intervals)
  const chordNotes = Array.from(pitchClasses).map((pitchClass) => NOTE_NAMES[pitchClass])
  const pianoVoicingCount = Math.min(5, new Set(quality.intervals.map((interval) => interval % 12)).size)

  function handlePlaySample() {
    try {
      setAudioError(false)
      playChordSample(root, quality.intervals, instrument)
      setPlaying(true)
      window.setTimeout(() => setPlaying(false), 1750)
    } catch {
      setPlaying(false)
      setAudioError(true)
    }
  }

  function changeInstrument(next: Instrument) {
    setInstrument(next)
    setInversionIndex(0)
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]"><AudioLines className="size-3.5" />Chord reference</span>
          <h1 className="wf-page-title mt-3">Guitar &amp; Piano Chord Chart</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Choose a chord to see one clear playable shape at a time. Switch voicings to compare inversions without the extra fretboard noise.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">Root note
              <select value={root} onChange={(event) => { setRoot(Number(event.target.value)); setInversionIndex(0) }} className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]">
                {ROOT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-[var(--foreground)]">Chord type
              <select value={qualityId} onChange={(event) => { setQualityId(event.target.value); setInversionIndex(0) }} className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]">
                {CHORD_GROUPS.map((group) => <optgroup key={group} label={group}>{CHORD_TYPES.filter((type) => type.group === group).map((type) => <option key={type.id} value={type.id}>{type.label}{type.suffix ? " · " + type.suffix : ""}</option>)}</optgroup>)}
              </select>
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Instrument">
              <button type="button" onClick={() => changeInstrument("guitar")} aria-pressed={instrument === "guitar"} className={"inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition " + (instrument === "guitar" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}><Guitar className="size-4" />Guitar</button>
              <button type="button" onClick={() => changeInstrument("piano")} aria-pressed={instrument === "piano"} className={"inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition " + (instrument === "piano" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}><Piano className="size-4" />Piano</button>
            </div>
            <button type="button" onClick={handlePlaySample} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2"><Volume2 className="size-4" />{playing ? "Playing sample…" : "Play " + instrument + " sample"}</button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Selected chord</p><div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{chordSymbol}</h2><span className="text-sm text-[var(--muted)]">{quality.label}</span></div></div>
          <div className="sm:text-right"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Chord notes</p><div className="mt-2 flex flex-wrap gap-2 sm:justify-end">{chordNotes.map((note) => <span key={note} className={"rounded-lg px-2.5 py-1 text-sm font-semibold " + (note === rootName ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]")}>{note}</span>)}</div></div>
        </div>
        {audioError ? <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Audio could not start. Check that your browser allows sound, then try again.</p> : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-semibold text-[var(--foreground)]">{instrument === "guitar" ? "Guitar shape" : "Piano inversion"}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{instrument === "guitar" ? "One playable fingering at a time, on the fretboard through fret 15." : "One inversion at a time, on a compact C3–C5 keyboard."}</p></div>
          <ChordToneLegend />
        </div>
        {instrument === "guitar" ? <GuitarShapeSelector key={chordSymbol} root={root} intervals={quality.intervals} /> : <div className="space-y-4"><div className="flex flex-wrap gap-2" aria-label="Select piano inversion">{Array.from({ length: pianoVoicingCount }, (_, index) => <button key={index} type="button" onClick={() => setInversionIndex(index)} aria-pressed={inversionIndex === index} className={"rounded-lg border px-3 py-2 text-xs font-semibold transition " + (inversionIndex === index ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--border)] bg-white text-[var(--muted)] hover:text-[var(--foreground)]")}>{index === 0 ? "Root position" : index + (index === 1 ? "st" : index === 2 ? "nd" : index === 3 ? "rd" : "th") + " inversion"}</button>)}</div><PianoKeyboard root={root} intervals={quality.intervals} inversionIndex={inversionIndex} /></div>}
      </section>
    </div>
  )
}
