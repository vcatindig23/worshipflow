"use client"

import { useState } from "react"
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

function GuitarFretboard({ root, pitchClasses }: { root: number; pitchClasses: Set<number> }) {
  const stringMidi = [64, 59, 55, 50, 45, 40]
  const stringNames = ["E", "B", "G", "D", "A", "E"]
  const left = 78
  const fretWidth = 50
  const top = 43
  const stringGap = 31
  const bottom = top + stringGap * 5
  const width = left + fretWidth * 15 + 28
  const height = 238

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#fbfaf7] p-2">
      <svg role="img" aria-label="Guitar fretboard from open strings through fret 15. Root notes use the stronger highlight; other chord tones use a softer highlight." viewBox={"0 0 " + width + " " + height} className="block min-w-[760px] w-full">
        <rect x={left} y={top - 10} width={fretWidth * 15} height={bottom - top + 20} rx="4" fill="#e8d7b5" />
        {Array.from({ length: 16 }, (_, fret) => {
          const x = left + fret * fretWidth
          return (
            <g key={"fret-" + fret}>
              <line x1={x} y1={top - 10} x2={x} y2={bottom + 10} stroke={fret === 0 ? "#7c7468" : "#b6a58b"} strokeWidth={fret === 0 ? 4 : 1.3} />
              <text x={fret === 0 ? x - 17 : x - fretWidth / 2} y="18" fill="#68645d" fontSize="11" textAnchor="middle">{fret}</text>
            </g>
          )
        })}
        {[3, 5, 7, 9, 12, 15].map((fret) => (
          <g key={"marker-" + fret} fill="#c4b08d" opacity="0.8">
            <circle cx={left + (fret - 0.5) * fretWidth} cy={top + stringGap * 2.5} r="4" />
            {fret === 12 ? <circle cx={left + (fret - 0.5) * fretWidth} cy={top + stringGap * 1.5} r="4" /> : null}
          </g>
        ))}
        {stringMidi.map((openMidi, stringIndex) => {
          const y = top + stringIndex * stringGap
          return (
            <g key={"string-" + stringNames[stringIndex] + "-" + stringIndex}>
              <text x="27" y={y + 4} fill="#68645d" fontSize="12" fontWeight="600" textAnchor="middle">{stringNames[stringIndex]}</text>
              <line x1={left - 2} y1={y} x2={left + fretWidth * 15} y2={y} stroke="#7d7567" strokeWidth={2.3 - stringIndex * 0.2} />
              {Array.from({ length: 16 }, (_, fret) => {
                const pitchClass = (openMidi + fret) % 12
                if (!pitchClasses.has(pitchClass)) return null
                const x = fret === 0 ? left - 18 : left + (fret - 0.5) * fretWidth
                const isRoot = pitchClass === root
                return (
                  <g key={"note-" + stringIndex + "-" + fret}>
                    <circle cx={x} cy={y} r="11" fill={isRoot ? "var(--brand)" : "var(--brand-soft)"} stroke={isRoot ? "var(--brand)" : "#cad7ca"} strokeWidth="1" />
                    <text x={x} y={y + 3.3} fill={isRoot ? "#ffffff" : "#26352c"} fontSize="8.5" fontWeight="700" textAnchor="middle">{NOTE_NAMES[pitchClass]}</text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function PianoKeyboard({ root, pitchClasses }: { root: number; pitchClasses: Set<number> }) {
  const whiteKeys = Array.from({ length: PIANO_KEY_COUNT }, (_, index) => {
    const noteIndex = index % 7
    const octave = 3 + Math.floor(index / 7)
    const pitchClass = WHITE_PITCH_CLASSES[noteIndex]
    return { index, label: WHITE_NOTE_NAMES[noteIndex] + octave, pitchClass, x: index * WHITE_KEY_WIDTH }
  })
  const blackNotes = [
    { pitchClass: 1, label: "C♯", afterWhite: 1 },
    { pitchClass: 3, label: "D♯", afterWhite: 2 },
    { pitchClass: 6, label: "F♯", afterWhite: 4 },
    { pitchClass: 8, label: "G♯", afterWhite: 5 },
    { pitchClass: 10, label: "A♯", afterWhite: 6 },
  ].flatMap((note) =>
    [0, 1].map((octaveIndex) => ({
      ...note,
      x: (octaveIndex * 7 + note.afterWhite) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
    }))
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[#f8fafc] p-3">
      <svg role="img" aria-label="Piano keyboard across the suggested two-octave range C3 to C5, with the selected chord tones highlighted." viewBox={"0 0 " + PIANO_WIDTH + " 180"} className="block min-w-[680px] w-full">
        {whiteKeys.map((key) => {
          const isChordTone = pitchClasses.has(key.pitchClass)
          const isRoot = key.pitchClass === root
          return (
            <g key={key.label}>
              <rect x={key.x} y="0" width={WHITE_KEY_WIDTH} height="164" rx="2" fill={isRoot ? "var(--brand)" : isChordTone ? "var(--brand-soft)" : "#ffffff"} stroke="#b8c0c9" strokeWidth="1" />
              <text x={key.x + WHITE_KEY_WIDTH / 2} y="151" fontSize="10" textAnchor="middle" fill={isRoot ? "#ffffff" : "#475569"} fontWeight={isRoot ? "700" : "500"}>{key.label}</text>
            </g>
          )
        })}
        {blackNotes.map((key, index) => {
          const isChordTone = pitchClasses.has(key.pitchClass)
          const isRoot = key.pitchClass === root
          return (
            <g key={key.label + "-" + index}>
              <rect x={key.x} y="0" width={BLACK_KEY_WIDTH} height="105" rx="2" fill={isRoot ? "var(--brand)" : isChordTone ? "var(--brand-soft)" : "#20242b"} stroke={isChordTone ? "#d2ddd2" : "#111827"} strokeWidth="1" />
              {isChordTone ? <text x={key.x + BLACK_KEY_WIDTH / 2} y="92" fontSize="8" textAnchor="middle" fill={isRoot ? "#ffffff" : "#26352c"} fontWeight="700">{key.label}</text> : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ChordToneLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-[var(--brand)]" />Root note</span>
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full border border-[#cad7ca] bg-[var(--brand-soft)]" />Other chord tones</span>
    </div>
  )
}

export default function ChordChartExplorer() {
  const [instrument, setInstrument] = useState<Instrument>("guitar")
  const [root, setRoot] = useState(0)
  const [qualityId, setQualityId] = useState("major")
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)

  const quality = CHORD_TYPES.find((item) => item.id === qualityId) ?? CHORD_TYPES[0]
  const rootName = NOTE_NAMES[root]
  const chordSymbol = rootName + quality.suffix
  const pitchClasses = getChordPitchClasses(root, quality.intervals)
  const chordNotes = Array.from(pitchClasses).map((pitchClass) => NOTE_NAMES[pitchClass])

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

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            <AudioLines className="size-3.5" />
            Chord reference
          </span>
          <h1 className="wf-page-title mt-3">Guitar &amp; Piano Chord Chart</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Look up common and advanced chords, see their notes on your instrument, and hear a quick sample.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Root note
              <select value={root} onChange={(event) => setRoot(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]">
                {ROOT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-medium text-[var(--foreground)]">
              Chord type
              <select value={qualityId} onChange={(event) => setQualityId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]">
                {CHORD_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {CHORD_TYPES.filter((type) => type.group === group).map((type) => (
                      <option key={type.id} value={type.id}>{type.label}{type.suffix ? " · " + type.suffix : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Instrument">
              <button type="button" onClick={() => setInstrument("guitar")} aria-pressed={instrument === "guitar"} className={"inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition " + (instrument === "guitar" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
                <Guitar className="size-4" />Guitar
              </button>
              <button type="button" onClick={() => setInstrument("piano")} aria-pressed={instrument === "piano"} className={"inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition " + (instrument === "piano" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
                <Piano className="size-4" />Piano
              </button>
            </div>

            <button type="button" onClick={handlePlaySample} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2">
              <Volume2 className="size-4" />
              {playing ? "Playing sample…" : "Play " + instrument + " sample"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Selected chord</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{chordSymbol}</h2>
              <span className="text-sm text-[var(--muted)]">{quality.label}</span>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Chord tones</p>
            <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
              {chordNotes.map((note) => (
                <span key={note} className={"rounded-lg px-2.5 py-1 text-sm font-semibold " + (note === rootName ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]")}>{note}</span>
              ))}
            </div>
          </div>
        </div>

        {audioError ? (
          <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Audio could not start. Check that your browser allows sound, then try again.
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{instrument === "guitar" ? "Guitar fretboard" : "Piano keyboard"}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {instrument === "guitar"
                ? "Standard tuning · open strings through fret 15. Highlighted positions show where each chord tone appears, not one required fingering."
                : "Suggested range: C3–C5 (two octaves). Highlighted keys show the notes that make up the selected chord."}
            </p>
          </div>
          <ChordToneLegend />
        </div>

        {instrument === "guitar" ? <GuitarFretboard root={root} pitchClasses={pitchClasses} /> : <PianoKeyboard root={root} pitchClasses={pitchClasses} />}

        <div className="mt-4 rounded-xl bg-[var(--surface)] px-4 py-3 text-xs leading-5 text-[var(--muted)]">
          {instrument === "guitar"
            ? "Tip: use the same highlighted notes to explore different voicings higher up the neck."
            : "Tip: try the root with the third and fifth first, then add the highlighted extensions for a fuller voicing."}
        </div>
      </section>
    </div>
  )
}
