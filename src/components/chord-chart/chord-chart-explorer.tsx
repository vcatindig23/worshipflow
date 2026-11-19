"use client"

import { useMemo, useState } from "react"
import { Guitar, Piano, Volume2 } from "lucide-react"
import { generateGuitarShapes, GUITAR_STRING_NAMES, type GuitarShape } from "@/lib/chord-chart/guitar-shapes"

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

const WHITE_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]
const WHITE_NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"]
const WHITE_KEY_WIDTH = 60
const PIANO_KEY_COUNT = 15
const PIANO_WIDTH = WHITE_KEY_WIDTH * PIANO_KEY_COUNT
const BLACK_KEY_WIDTH = 28

function getChordPitchClasses(root: number, intervals: number[]) {
  return new Set(intervals.map((interval) => (root + interval) % 12))
}

const SOUND_FONT_BASE_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM"
const soundFontCache = new Map<string, Promise<Map<number, string>>>()

function sampleNameToMidi(name: string) {
  const match = /^([A-G])(#?)(-?\d+)$/.exec(name)
  if (!match) return null
  const pitch = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[match[1]]
  return (Number(match[3]) + 1) * 12 + pitch + (match[2] ? 1 : 0)
}

function loadSoundFont(instrument: Instrument) {
  const name = instrument === "guitar" ? "electric_guitar_clean" : "acoustic_grand_piano"
  const existing = soundFontCache.get(name)
  if (existing) return existing

  const request = fetch(SOUND_FONT_BASE_URL + "/" + name + "-mp3.js").then(async (response) => {
    if (!response.ok) throw new Error("Instrument samples could not be loaded")
    const source = await response.text()
    const samples = new Map<number, string>()
    const expression = /["']([A-G](?:#)?-?\d+)["']\s*:\s*["'](data:audio\/[^;]+;base64,[^"']+)["']/g
    let match: RegExpExecArray | null
    while ((match = expression.exec(source))) {
      const midi = sampleNameToMidi(match[1])
      if (midi !== null) samples.set(midi, match[2])
    }
    if (!samples.size) throw new Error("No playable instrument samples were found")
    return samples
  }).catch((error) => {
    soundFontCache.delete(name)
    throw error
  })
  soundFontCache.set(name, request)
  return request
}

async function playChordSample(noteMidis: number[], instrument: Instrument) {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) throw new Error("Web Audio is unavailable")
  const context = new AudioContextConstructor()

  try {
    const samples = await loadSoundFont(instrument)
    if (context.state === "suspended") await context.resume()

    const master = context.createGain()
    master.gain.setValueAtTime(0.72, context.currentTime)
    master.connect(context.destination)

    const decoded = new Map<number, AudioBuffer>()
    const sampleNotes = Array.from(samples.keys())
    const duration = instrument === "guitar" ? 2.1 : 2.8
    const start = context.currentTime + 0.035
    const uniqueNotes = Array.from(new Set(noteMidis)).sort((a, b) => a - b)

    await Promise.all(uniqueNotes.map(async (midi, index) => {
      const sampleMidi = sampleNotes.reduce((nearest, candidate) =>
        Math.abs(candidate - midi) < Math.abs(nearest - midi) ? candidate : nearest
      , sampleNotes[0])
      let buffer = decoded.get(sampleMidi)
      if (!buffer) {
        const response = await fetch(samples.get(sampleMidi)!)
        buffer = await context.decodeAudioData(await response.arrayBuffer())
        decoded.set(sampleMidi, buffer)
      }

      const source = context.createBufferSource()
      const envelope = context.createGain()
      const when = start + (instrument === "guitar" ? index * 0.012 : 0)
      source.buffer = buffer
      source.playbackRate.setValueAtTime(Math.pow(2, (midi - sampleMidi) / 12), when)
      envelope.gain.setValueAtTime(instrument === "guitar" ? 0.62 : 0.78, when)
      envelope.gain.setTargetAtTime(0.0001, when + duration * 0.68, instrument === "guitar" ? 0.42 : 0.7)
      source.connect(envelope)
      envelope.connect(master)
      source.start(when)
      source.stop(when + duration)
    }))

    window.setTimeout(() => void context.close(), 3600)
  } catch (error) {
    await context.close()
    throw error
  }
}


function getChordOrder(root: number, intervals: number[]) {
  return Array.from(new Set(intervals.map((interval) => (root + interval) % 12)))
}

function getInversionName(root: number, bassPitchClass: number, chordOrder: number[]) {
  const index = chordOrder.indexOf(bassPitchClass)
  if (bassPitchClass === root || index <= 0) return "Root position"
  const suffixes = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"]
  return (suffixes[index] ?? (index + "th")) + " inversion"
}

function GuitarShapeDiagram({ shape, root }: { shape: GuitarShape; root: number }) {
  const left = 34
  const stringGap = 20
  const right = left + stringGap * 5
  const gridTop = 29
  const fretGap = 22
  const fretRows = 5
  const gridBottom = gridTop + fretGap * fretRows
  const startFret = shape.minFret > 0 ? shape.minFret : 1
  const stringWidths = [2.8, 2.5, 2.1, 1.8, 1.5, 1.25]

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 166 174"
      className="mx-auto block h-auto w-full max-w-[188px]"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        x={left - 8}
        y={gridTop}
        width={right - left + 16}
        height={gridBottom - gridTop}
        fill="transparent"
      />

      {Array.from({ length: fretRows + 1 }, (_, row) => {
        const y = gridTop + row * fretGap
        const isNut = row === 0 && startFret === 1
        return (
          <g key={"fret-" + row}>
            {isNut ? (
              <line
                x1={left - 8}
                y1={y + 1.4}
                x2={right + 8}
                y2={y + 1.4}
                stroke="#252525"
                strokeWidth="5"
              />
            ) : (
              <line
                x1={left - 8}
                y1={y}
                x2={right + 8}
                y2={y}
                stroke="#363638"
                strokeWidth="1.5"
              />
            )}
          </g>
        )
      })}

      {Array.from({ length: fretRows }, (_, row) => (
        <text
          key={"fret-number-" + row}
          x="14"
          y={gridTop + (row + 0.5) * fretGap + 3.2}
          fill="var(--foreground)"
          fontSize="10"
          fontWeight="500"
          textAnchor="middle"
        >
          {startFret + row}
        </text>
      ))}

      {GUITAR_STRING_NAMES.map((name, stringIndex) => {
        const x = left + stringIndex * stringGap
        const fret = shape.frets[stringIndex]
        return (
          <g key={"string-" + stringIndex}>
            <line
              x1={x}
              y1={gridTop}
              x2={x}
              y2={gridBottom}
              stroke="#303033"
              strokeWidth={stringWidths[stringIndex]}
            />
            {fret === null ? (
              <text
                x={x}
                y="17"
                fill="#c62828"
                fontSize="16"
                fontWeight="700"
                textAnchor="middle"
              >
                ×
              </text>
            ) : fret === 0 ? (
              <circle
                cx={x}
                cy="14"
                r="6.2"
                fill="#ffc928"
                stroke="#181818"
                strokeWidth="1.5"
              />
            ) : null}
            <text
              x={x}
              y="159"
              fill="var(--foreground)"
              fontSize="10"
              fontWeight="600"
              textAnchor="middle"
            >
              {name}
            </text>
          </g>
        )
      })}

      {shape.barres.map((barreFret) => {
        const stringIndexes = shape.frets
          .map((fret, stringIndex) =>
            fret === barreFret && (shape.fingers[stringIndex] ?? 0) > 0
              ? stringIndex
              : -1
          )
          .filter((stringIndex) => stringIndex >= 0)
        if (stringIndexes.length < 2) return null
        const first = Math.min(...stringIndexes)
        const last = Math.max(...stringIndexes)
        const y = gridTop + (barreFret - startFret + 0.5) * fretGap
        if (y < gridTop || y > gridBottom) return null
        return (
          <g key={"barre-" + barreFret}>
            <line
              x1={left + first * stringGap}
              y1={y}
              x2={left + last * stringGap}
              y2={y}
              stroke="#242424"
              strokeWidth="13.5"
              strokeLinecap="round"
            />
            <line
              x1={left + first * stringGap}
              y1={y}
              x2={left + last * stringGap}
              y2={y}
              stroke="#ffc928"
              strokeWidth="11"
              strokeLinecap="round"
            />
          </g>
        )
      })}

      {shape.notes.map((note) => {
        if (note.fret === 0) return null
        const x = left + note.stringIndex * stringGap
        const y = gridTop + (note.fret - startFret + 0.5) * fretGap
        if (y < gridTop || y > gridBottom) return null
        const isRoot = note.pitchClass === root
        const hasSuggestedFingering = shape.reference || shape.transposed
        const fingerLabel = hasSuggestedFingering && note.finger > 0
          ? String(note.finger)
          : NOTE_NAMES[note.pitchClass]
        return (
          <g key={"note-" + note.stringIndex}>
            <circle
              cx={x}
              cy={y}
              r="8.7"
              fill={isRoot ? "#f28a00" : "#ffc928"}
              stroke="#181818"
              strokeWidth="1.35"
            />
            <text
              x={x}
              y={y + 3.1}
              fill="#211c12"
              fontSize={fingerLabel.length > 1 ? "6.7" : "9"}
              fontWeight="700"
              textAnchor="middle"
            >
              {fingerLabel}
            </text>
          </g>
        )
      })}
    </svg>
  )
}


function GuitarFretboard({ shape, root }: { shape: GuitarShape; root: number }) {
  const boardX = 72
  const boardY = 34
  const boardWidth = 1050
  const boardHeight = 132
  const fretboardEndFret = 15
  const scaleLength = boardWidth / (1 - Math.pow(2, -fretboardEndFret / 12))
  const fretPositions = Array.from(
    { length: fretboardEndFret + 1 },
    (_, fret) => boardX + scaleLength * (1 - Math.pow(2, -fret / 12))
  )
  const stringYByIndex = [156, 134, 112, 90, 68, 46]
  const displayStringNames = ["E", "B", "G", "D", "A", "E"]
  const displayStringWidths = [1.2, 1.5, 1.9, 2.5, 3.1, 3.8]
  const markerFrets = [3, 5, 7, 9, 12, 15]

  function fretCenter(fret: number) {
    if (fret <= 0) return boardX - 15
    return (fretPositions[fret - 1] + fretPositions[fret]) / 2
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-3">
      <svg
        role="img"
        aria-label="Electric guitar fretboard showing frets zero through fifteen. The high E string is at the top and the low E string is at the bottom. Chord finger positions are highlighted."
        viewBox="0 0 1160 214"
        preserveAspectRatio="none"
        className="block h-[154px] w-full sm:h-[184px]"
      >
        <defs>
          <linearGradient id="wf-fretboard-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b3a38" />
            <stop offset="0.46" stopColor="#292a2a" />
            <stop offset="1" stopColor="#3a3937" />
          </linearGradient>
          <linearGradient id="wf-fret-wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#776e5e" />
            <stop offset="0.22" stopColor="#d9c9a9" />
            <stop offset="0.48" stopColor="#f1e6d1" />
            <stop offset="0.74" stopColor="#a99a7e" />
            <stop offset="1" stopColor="#615a4f" />
          </linearGradient>
          <linearGradient id="wf-string-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbfbf8" />
            <stop offset="0.42" stopColor="#aeb1ad" />
            <stop offset="0.7" stopColor="#e5e4dc" />
            <stop offset="1" stopColor="#777c7a" />
          </linearGradient>
          <pattern id="wf-wood-grain" width="220" height="30" patternUnits="userSpaceOnUse">
            <path d="M0 7 C48 2 76 13 124 7 S182 5 220 10 M0 23 C52 18 91 29 142 21 S185 21 220 25" fill="none" stroke="#d4c5ae" strokeOpacity=".065" strokeWidth="1" />
          </pattern>
          <filter id="wf-fret-shadow" x="-20%" y="-10%" width="140%" height="120%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
          <filter id="wf-note-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#111827" floodOpacity=".45" />
          </filter>
        </defs>

        <rect
          x={boardX - 3}
          y={boardY - 2}
          width={boardWidth + 6}
          height={boardHeight + 4}
          rx="3"
          fill="#151718"
          stroke="#858078"
          strokeWidth="1"
        />
        <rect
          x={boardX}
          y={boardY}
          width={boardWidth}
          height={boardHeight}
          fill="url(#wf-fretboard-wood)"
        />
        <rect
          x={boardX}
          y={boardY}
          width={boardWidth}
          height={boardHeight}
          fill="url(#wf-wood-grain)"
        />

        {markerFrets.map((fret) => {
          const x = fretCenter(fret)
          return fret === 12 ? (
            <g key={fret} fill="#c6b99f" opacity=".28">
              <circle cx={x} cy="78" r="5.5" />
              <circle cx={x} cy="122" r="5.5" />
            </g>
          ) : (
            <circle key={fret} cx={x} cy="100" r="5.5" fill="#c6b99f" opacity=".28" />
          )
        })}

        {fretPositions.slice(1).map((x, index) => (
          <g key={index + 1}>
            <line
              x1={x + 1.3}
              y1={boardY + 1}
              x2={x + 1.3}
              y2={boardY + boardHeight - 1}
              stroke="#0e1011"
              strokeOpacity=".58"
              strokeWidth="5.5"
              filter="url(#wf-fret-shadow)"
            />
            <line
              x1={x}
              y1={boardY}
              x2={x}
              y2={boardY + boardHeight}
              stroke="url(#wf-fret-wire)"
              strokeWidth={index === 11 ? 4.2 : 3.1}
            />
            <line
              x1={x - 1.2}
              y1={boardY + 2}
              x2={x - 1.2}
              y2={boardY + boardHeight - 2}
              stroke="#fff4df"
              strokeOpacity=".22"
              strokeWidth=".8"
            />
          </g>
        ))}

        <rect
          x={boardX - 5}
          y={boardY - 1}
          width="8"
          height={boardHeight + 2}
          fill="#101213"
          stroke="#b8b6ac"
          strokeOpacity=".42"
          strokeWidth=".8"
        />

        {displayStringNames.map((name, row) => {
          const y = stringYByIndex[5 - row]
          return (
            <g key={row}>
              <text
                x="27"
                y={y + 4}
                textAnchor="middle"
                fill="var(--foreground)"
                fontSize="13"
                fontWeight="700"
              >
                {name}
              </text>
              <line
                x1={boardX - 1}
                y1={y}
                x2={boardX + boardWidth + 1}
                y2={y}
                stroke="#16191a"
                strokeOpacity=".65"
                strokeWidth={displayStringWidths[row] + 1.7}
              />
              <line
                x1={boardX - 1}
                y1={y}
                x2={boardX + boardWidth + 1}
                y2={y}
                stroke="url(#wf-string-metal)"
                strokeWidth={displayStringWidths[row]}
              />
            </g>
          )
        })}

        {shape.frets.map((fret, stringIndex) => {
          const note = shape.notes.find((item) => item.stringIndex === stringIndex)
          if (fret === null || !note) return null
          const x = fret === 0 ? boardX - 15 : fretCenter(fret)
          const y = stringYByIndex[stringIndex]
          const isRoot = note.pitchClass === root
          return (
            <g key={stringIndex} filter="url(#wf-note-shadow)">
              <circle
                cx={x}
                cy={y}
                r="10.5"
                fill="#f8faf7"
                stroke={isRoot ? "var(--brand)" : "#59675d"}
                strokeWidth={isRoot ? "2.4" : "1.4"}
              />
              <text
                x={x}
                y={y + 3.8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill="#243229"
              >
                {shape.fingers[stringIndex] > 0 ? shape.fingers[stringIndex] : NOTE_NAMES[note.pitchClass]}
              </text>
            </g>
          )
        })}

        {Array.from({ length: fretboardEndFret + 1 }, (_, fret) => (
          <text
            key={fret}
            x={fret === 0 ? boardX - 15 : fretCenter(fret)}
            y="190"
            textAnchor="middle"
            fill="var(--foreground)"
            fontSize="12"
            fontWeight="500"
          >
            {fret}
          </text>
        ))}
      </svg>
    </div>
  )
}
function GuitarShapeSelector({
  shapes,
  root,
  chordOrder,
  selectedIndex,
  onSelectedIndexChange,
  view,
  onViewChange,
}: {
  shapes: GuitarShape[]
  root: number
  chordOrder: number[]
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  view: "fretboard" | "diagrams"
  onViewChange: (view: "fretboard" | "diagrams") => void
}) {
  const safeIndex = Math.min(selectedIndex, Math.max(0, shapes.length - 1))
  const shape = shapes[safeIndex]
  if (!shape) return <p className="rounded-lg bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">No playable shape found within the first 15 frets. Try a simpler chord extension.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" role="group" aria-label="Guitar chart view">
          {(["fretboard", "diagrams"] as const).map((option) => (
            <button key={option} type="button" onClick={() => onViewChange(option)} aria-pressed={view === option} className={"min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (view === option ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
              {option === "fretboard" ? "Fretboard" : "Diagrams"}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">{view === "fretboard" ? "Full neck · frets 1–15" : shapes.length + " chord voicings · low E to high E"}</p>
      </div>

      {view === "fretboard" ? (
        <GuitarFretboard shape={shape} root={root} />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Available guitar chord diagrams">
          {shapes.map((diagramShape, index) => {
            const inversion = getInversionName(root, diagramShape.bassPitchClass, chordOrder)
            const selected = safeIndex === index
            return (
              <button
                key={diagramShape.frets.join("-")}
                type="button"
                onClick={() => onSelectedIndexChange(index)}
                aria-pressed={selected}
                aria-label={"Select guitar inversion " + (index + 1) + ": " + inversion}
                className={"min-w-0 rounded-lg border p-1.5 transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (selected ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-sm" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]")}
              >
                <GuitarShapeDiagram shape={diagramShape} root={root} />
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Guitar inversions</span>
        <span className="text-xs text-[var(--muted)]">Select 1–{shapes.length}</span>
      </div>
      <div role="group" aria-label="Select guitar inversion" className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const available = index < shapes.length
          return <button key={index} type="button" disabled={!available} onClick={() => onSelectedIndexChange(index)} aria-pressed={available && safeIndex === index} aria-label={"Guitar inversion " + (index + 1)} className={"min-h-10 rounded-lg border text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (available && safeIndex === index ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : available ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--brand)]" : "cursor-not-allowed border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] opacity-40")}>
            {index + 1}
          </button>
        })}
      </div>
    </div>
  )
}

function getPianoVoicing(root: number, intervals: number[], inversionIndex: number) {
  const toneIntervals = new Map<number, number>()
  intervals.forEach((interval) => {
    const pitchClass = interval % 12
    const existing = toneIntervals.get(pitchClass)
    if (existing === undefined || interval < existing) toneIntervals.set(pitchClass, interval)
  })
  const ordered = Array.from(toneIntervals.values()).sort((a, b) => a - b)
  const rotation = inversionIndex % ordered.length
  const rotated = [
    ...ordered.slice(rotation),
    ...ordered.slice(0, rotation).map((interval) => interval + 12),
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
      <div className="rounded-xl border border-[var(--border)] bg-[#f8fafc] p-2 sm:p-3">
        <svg role="img" aria-label={"Piano chord voicing in " + getInversionName(root, bass.pitchClass, chordOrder) + ", selected notes only."} viewBox={"0 0 " + PIANO_WIDTH + " 180"} preserveAspectRatio="none" className="block h-[140px] w-full sm:h-[164px]">
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

export default function ChordChartExplorer() {
  const [instrument, setInstrument] = useState<Instrument>("guitar")
  const [root, setRoot] = useState(0)
  const [qualityId, setQualityId] = useState("major")
  const [inversionIndex, setInversionIndex] = useState(0)
  const [guitarShapeIndex, setGuitarShapeIndex] = useState(0)
  const [guitarView, setGuitarView] = useState<"fretboard" | "diagrams">("fretboard")
  const [allChordOpen, setAllChordOpen] = useState(false)
  const [chordSearch, setChordSearch] = useState("")
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)

  const quality = CHORD_TYPES.find((item) => item.id === qualityId) ?? CHORD_TYPES[0]
  const rootName = NOTE_NAMES[root]
  const chordSymbol = rootName + quality.suffix
  const chordNotes = Array.from(getChordPitchClasses(root, quality.intervals)).map((pitchClass) => NOTE_NAMES[pitchClass])
  const guitarShapes = useMemo(() => generateGuitarShapes(root, quality.intervals, quality.id), [root, quality.intervals, quality.id])
  const guitarChordOrder = getChordOrder(root, quality.intervals)
  const pianoVoicingCount = Math.min(5, new Set(quality.intervals.map((interval) => interval % 12)).size)
  const pianoVoicing = getPianoVoicing(root, quality.intervals, inversionIndex)
  const matchingChordTypes = CHORD_TYPES.filter((type) => {
    const query = chordSearch.trim().toLowerCase()
    return !query || [type.label, type.suffix, type.id, type.group].some((value) => value.toLowerCase().includes(query))
  })

  function resetVoicings() {
    setInversionIndex(0)
    setGuitarShapeIndex(0)
  }

  function chooseRoot(nextRoot: number) {
    setRoot(nextRoot)
    resetVoicings()
  }

  function chooseChord(nextQualityId: string) {
    setQualityId(nextQualityId)
    resetVoicings()
    setAllChordOpen(false)
    setChordSearch("")
  }

  async function handlePlayChord() {
    try {
      setAudioError(false)
      setPlaying(true)
      const notes = instrument === "guitar"
        ? (guitarShapes[Math.min(guitarShapeIndex, Math.max(0, guitarShapes.length - 1))]?.notes.map((note) => note.midi) ?? quality.intervals.map((interval) => 48 + root + interval))
        : pianoVoicing.map((note) => note.midi)
      await playChordSample(notes, instrument)
      window.setTimeout(() => setPlaying(false), instrument === "guitar" ? 2300 : 3000)
    } catch {
      setPlaying(false)
      setAudioError(true)
    }
  }

  function changeInstrument(next: Instrument) {
    setInstrument(next)
    resetVoicings()
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-3 pb-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">Chord reference</p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">Guitar & Piano Chord Chart</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Choose instrument" className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            <button type="button" onClick={() => changeInstrument("guitar")} aria-pressed={instrument === "guitar"} className={"inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (instrument === "guitar" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
              <Guitar className="size-4" aria-hidden="true" />Guitar
            </button>
            <button type="button" onClick={() => changeInstrument("piano")} aria-pressed={instrument === "piano"} className={"inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (instrument === "piano" ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]")}>
              <Piano className="size-4" aria-hidden="true" />Piano
            </button>
          </div>
          <button type="button" onClick={handlePlayChord} disabled={playing} aria-label={playing ? "Playing " + instrument + " chord" : "Play " + instrument + " chord"} aria-busy={playing} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2">
            <Volume2 className="size-4" aria-hidden="true" />{playing ? "Playing chord…" : "Play chord"}
          </button>
        </div>
      </header>

      <section aria-label="Chord chart" className="wf-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{chordSymbol}</h2>
            <span className="text-sm text-[var(--muted)]">{quality.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label={"Chord notes: " + chordNotes.join(", ")}>
            {chordNotes.map((note) => <span key={note} className={"rounded-md px-2 py-1 text-xs font-semibold " + (note === rootName ? "bg-[var(--brand)] text-white" : "bg-[var(--surface)] text-[var(--foreground)]")}>{note}</span>)}
          </div>
        </div>

        {instrument === "guitar" ? (
          <GuitarShapeSelector
            shapes={guitarShapes}
            root={root}
            chordOrder={guitarChordOrder}
            selectedIndex={guitarShapeIndex}
            onSelectedIndexChange={setGuitarShapeIndex}
            view={guitarView}
            onViewChange={setGuitarView}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Piano voicing</h3>
                <p className="text-xs text-[var(--muted)]">C3–C5 · highlighted keys are played together</p>
              </div>
              <div role="group" aria-label="Select piano inversion" className="flex flex-wrap gap-1.5">
                {Array.from({ length: pianoVoicingCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setInversionIndex(index)}
                    onKeyDown={(event) => {
                      let nextIndex: number
                      if (event.key === "ArrowRight") {
                        nextIndex = (index + 1) % pianoVoicingCount
                      } else if (event.key === "ArrowLeft") {
                        nextIndex = (index - 1 + pianoVoicingCount) % pianoVoicingCount
                      } else if (event.key === "Home") {
                        nextIndex = 0
                      } else if (event.key === "End") {
                        nextIndex = pianoVoicingCount - 1
                      } else {
                        return
                      }
                      event.preventDefault()
                      setInversionIndex(nextIndex)
                      event.currentTarget.parentElement
                        ?.querySelectorAll<HTMLButtonElement>("button")[nextIndex]
                        ?.focus()
                    }}
                    tabIndex={inversionIndex === index ? 0 : -1}
                    aria-pressed={inversionIndex === index}
                    className={"min-h-9 rounded-lg border px-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (inversionIndex === index ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]")}>
                    {index === 0 ? "Root" : String(index)}
                  </button>
                ))}
              </div>
            </div>
            <PianoKeyboard root={root} intervals={quality.intervals} inversionIndex={inversionIndex} />
            <p className="text-xs text-[var(--muted)]">Selected voicing: {pianoVoicing.map((note) => NOTE_NAMES[note.pitchClass]).join(" · ")}. Use the inversion buttons to move the chord tones while keeping the same chord quality.</p>
          </div>
        )}

        {audioError ? <p role="alert" className="rounded-lg border border-[var(--warning)]/35 bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--foreground)]">Audio samples could not load. Check your connection and allow sound in your browser, then try again.</p> : null}
        <p className="text-[10px] leading-4 text-[var(--muted)]">Audio samples: <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--foreground)]">FluidR3_GM by Frank Wen & contributors</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[var(--foreground)]">CC BY 3.0</a>.</p>

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Root note</h3>
            <span className="text-xs text-[var(--muted)]">Choose C–B</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {ROOT_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => chooseRoot(option.value)} aria-pressed={root === option.value} className={"min-h-9 rounded-lg border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (root === option.value ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--brand)]")}>
                {NOTE_NAMES[option.value]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Chord extensions</h3>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["major", "Major"], ["minor", "Minor"], ["dominant-seven", "7"], ["minor-seven", "m7"],
              ["major-seven", "maj7"], ["sus4", "sus4"], ["sus2", "sus2"], ["power", "5"],
              ["diminished", "dim"], ["seven-sus-four", "7sus4"], ["diminished-seven", "dim7"],
            ].map(([id, label]) => (
              <button key={id} type="button" onClick={() => chooseChord(id)} aria-pressed={qualityId === id} className={"min-h-9 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (qualityId === id ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--brand)]")}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => setAllChordOpen((open) => !open)} aria-expanded={allChordOpen} aria-controls="all-chords-panel" className={"min-h-9 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (allChordOpen ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--brand)]")}>
              All chords <span aria-hidden="true">{allChordOpen ? "−" : "+"}</span>
            </button>
          </div>
          {allChordOpen ? (
            <div id="all-chords-panel" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
              <label className="block">
                <span className="sr-only">Search all chord extensions</span>
                <input type="search" value={chordSearch} onChange={(event) => setChordSearch(event.target.value)} placeholder="Search chord extensions…" className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)] sm:text-sm" />
              </label>
              <div className="mt-2 grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain sm:grid-cols-3 lg:grid-cols-4">
                {matchingChordTypes.map((type) => (
                  <button key={type.id} type="button" onClick={() => chooseChord(type.id)} aria-pressed={qualityId === type.id} className={"flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] " + (qualityId === type.id ? "bg-[var(--brand-soft)] font-semibold text-[var(--brand)]" : "text-[var(--foreground)] hover:bg-[var(--card)]")}>
                    <span className="truncate">{type.label}</span><span className="shrink-0 font-mono text-[var(--muted)]">{type.suffix || "maj"}</span>
                  </button>
                ))}
                {!matchingChordTypes.length ? <p className="col-span-full px-2 py-4 text-center text-xs text-[var(--muted)]">No chord extensions match “{chordSearch}”.</p> : null}
              </div>
              <p className="mt-2 text-[10px] text-[var(--muted)]">{matchingChordTypes.length} chord types available</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
