"use client"

import { Gauge, Hand, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  clampPracticeTempo,
  estimateTapTempo,
} from "@/lib/practice-tempo"
import {
  readSongPracticeSettings,
  updateSongPracticeSettings,
} from "@/lib/song-practice-settings"

type PracticeMetronomeProps = {
  initialTempo?: number | null
  dark?: boolean
  settingsStorageKey?: string | null
}

function scheduleClick(context: AudioContext, at: number, accented: boolean) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(accented ? 1320 : 880, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(accented ? 0.28 : 0.17, at + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.075)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(at)
  oscillator.stop(at + 0.08)
}

export default function PracticeMetronome({
  initialTempo,
  dark = false,
  settingsStorageKey = null,
}: PracticeMetronomeProps) {
  const [tempo, setTempo] = useState(() => clampPracticeTempo(initialTempo))
  const [running, setRunning] = useState(false)
  const [countInEnabled, setCountInEnabled] = useState(true)
  const [activeBeat, setActiveBeat] = useState(0)
  const [beatLabel, setBeatLabel] = useState("Ready when you are")
  const [audioError, setAudioError] = useState("")
  const [tapCount, setTapCount] = useState(0)
  const [settingsLoadedKey, setSettingsLoadedKey] = useState<string | null>(null)
  const bpmRef = useRef(tempo)
  const audioContextRef = useRef<AudioContext | null>(null)
  const tapTimesRef = useRef<number[]>([])

  useEffect(() => {
    if (!settingsStorageKey) return

    const settings = readSongPracticeSettings(settingsStorageKey)
    if (settings.tempo !== undefined) setTempo(settings.tempo)
    if (settings.countInEnabled !== undefined) setCountInEnabled(settings.countInEnabled)
    setSettingsLoadedKey(settingsStorageKey)
  }, [settingsStorageKey])

  useEffect(() => {
    if (!settingsStorageKey || settingsLoadedKey !== settingsStorageKey) return

    updateSongPracticeSettings(settingsStorageKey, {
      tempo,
      countInEnabled,
    })
  }, [settingsStorageKey, settingsLoadedKey, tempo, countInEnabled])

  useEffect(() => {
    bpmRef.current = tempo
  }, [tempo])

  useEffect(() => {
    if (!running) return
    const context = audioContextRef.current
    if (!context) return

    let nextNoteTime = context.currentTime + 0.06
    let beatNumber = 0
    let countInRemaining = countInEnabled ? 4 : 0
    const pendingVisualTimers = new Set<number>()

    const scheduler = () => {
      while (nextNoteTime < context.currentTime + 0.12) {
        const isCountIn = countInRemaining > 0
        const beat = (beatNumber % 4) + 1
        scheduleClick(context, nextNoteTime, isCountIn ? countInRemaining === 4 : beat === 1)
        const label = isCountIn ? "Count-in " + countInRemaining : "Beat " + beat
        const visualBeat = isCountIn ? 5 - countInRemaining : beat
        const delay = Math.max(0, (nextNoteTime - context.currentTime) * 1000)
        let timer = 0
        timer = window.setTimeout(() => {
          setBeatLabel(label)
          setActiveBeat(visualBeat)
          pendingVisualTimers.delete(timer)
        }, delay)
        pendingVisualTimers.add(timer)

        if (isCountIn) {
          countInRemaining -= 1
        } else {
          beatNumber = (beatNumber + 1) % 4
        }
        nextNoteTime += 60 / bpmRef.current
      }
    }

    const interval = window.setInterval(scheduler, 25)
    scheduler()

    return () => {
      window.clearInterval(interval)
      pendingVisualTimers.forEach((timer) => window.clearTimeout(timer))
      pendingVisualTimers.clear()
    }
  }, [running, countInEnabled])

  useEffect(() => {
    return () => {
      const context = audioContextRef.current
      if (context && context.state !== "closed") {
        void context.close()
      }
    }
  }, [])

  async function toggleMetronome() {
    if (running) {
      setRunning(false)
      setActiveBeat(0)
      setBeatLabel("Stopped")
      return
    }

    try {
      if (!audioContextRef.current) {
        const AudioContextConstructor = window.AudioContext
        if (!AudioContextConstructor) {
          setAudioError("This browser does not support audio metronome playback.")
          return
        }
        audioContextRef.current = new AudioContextConstructor()
      }

      await audioContextRef.current.resume()
      setAudioError("")
      setBeatLabel(countInEnabled ? "Count-in starting" : "Starting")
      setActiveBeat(0)
      setRunning(true)
    } catch {
      setAudioError("Audio could not start. Check your browser audio permissions and try again.")
    }
  }

  function tapTempo() {
    const now = performance.now()
    const previous = tapTimesRef.current
    const next = previous.length > 0 && now - previous[previous.length - 1]! > 2500
      ? [now]
      : [...previous, now].slice(-6)
    tapTimesRef.current = next
    setTapCount(next.length)

    const estimated = estimateTapTempo(next)
    if (estimated !== null) {
      setTempo(estimated)
      setAudioError("")
    }
  }

  function resetTempo() {
    setTempo(clampPracticeTempo(initialTempo))
    tapTimesRef.current = []
    setTapCount(0)
  }

  const foreground = dark ? "text-white" : "text-[var(--foreground)]"
  const muted = dark ? "text-white/60" : "text-[var(--muted)]"
  const border = dark ? "border-white/15" : "border-[var(--border)]"
  const surface = dark ? "bg-white/5" : "bg-[var(--surface)]"
  const button = dark
    ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"

  return (
    <section
      aria-label="Song practice metronome"
      className={"rounded-2xl border p-4 sm:p-5 " + border + " " + (dark ? "bg-[#17221b]" : "bg-[var(--card)]")}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={"flex size-10 shrink-0 items-center justify-center rounded-xl " + surface + " " + foreground}>
            <Gauge className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className={"text-sm font-semibold " + foreground}>Practice tempo</h3>
            <p className={"mt-1 text-xs leading-5 " + muted}>
              Built-in click track with a four-beat count-in and tap tempo. No audio file required.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCountInEnabled((value) => !value)}
            disabled={running}
            aria-pressed={countInEnabled}
            className={"inline-flex h-11 items-center rounded-lg border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 " + button}
          >
            {countInEnabled ? "4-beat count-in" : "No count-in"}
          </button>
          <button
            type="button"
            onClick={tapTempo}
            aria-label="Tap to set practice tempo"
            className={"inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-xs font-semibold " + button}
          >
            <Hand className="size-3.5" />
            Tap tempo
          </button>
          <button
            type="button"
            onClick={resetTempo}
            aria-label="Reset practice tempo"
            title="Reset to the song's saved tempo"
            className={"inline-flex size-11 items-center justify-center rounded-lg border sm:size-9 " + button}
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <label htmlFor="practice-tempo" className={"text-xs font-medium " + muted}>Tempo</label>
            <div className="flex items-baseline gap-1.5">
              <span className={"text-3xl font-semibold tabular-nums " + foreground}>{tempo}</span>
              <span className={"text-xs " + muted}>BPM</span>
            </div>
          </div>
          <input
            id="practice-tempo"
            type="range"
            min={40}
            max={220}
            step={1}
            value={tempo}
            onChange={(event) => setTempo(clampPracticeTempo(Number(event.target.value)))}
            aria-label="Practice tempo in beats per minute"
            className="h-8 w-full cursor-pointer touch-pan-y accent-[var(--brand)]"
          />
          <div className={"mt-1.5 flex justify-between text-[10px] " + muted}>
            <span>40 BPM</span>
            <span>220 BPM</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <button
            type="button"
            onClick={() => setTempo((value) => clampPracticeTempo(value - 1))}
            disabled={tempo <= 40}
            aria-label="Decrease tempo by one BPM"
            className={"inline-flex size-11 items-center justify-center rounded-xl border disabled:opacity-40 sm:size-10 " + button}
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleMetronome}
            className={"inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition sm:h-10 " + (running ? (dark ? "bg-white text-[#17221b]" : "bg-[var(--surface)] text-[var(--foreground)]") : "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]")}
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Stop metronome" : "Start metronome"}
          </button>
          <button
            type="button"
            onClick={() => setTempo((value) => clampPracticeTempo(value + 1))}
            disabled={tempo >= 220}
            aria-label="Increase tempo by one BPM"
            className={"inline-flex size-11 items-center justify-center rounded-xl border disabled:opacity-40 sm:size-10 " + button}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className={"mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between " + border}>
        <div className="flex items-center gap-2.5" aria-hidden="true">
          {[1, 2, 3, 4].map((beat) => (
            <span
              key={beat}
              className={"size-2.5 rounded-full transition " + (running && activeBeat === beat ? "scale-125 bg-[var(--brand)] ring-4 ring-[var(--brand)]/15" : (dark ? "bg-white/20" : "bg-[var(--border)]"))}
            />
          ))}
        </div>
        <p className={"text-xs font-medium tabular-nums " + muted} role="status" aria-live="polite">
          {running ? beatLabel : beatLabel + (tapCount > 1 ? " · " + tapCount + " taps" : "")}
        </p>
      </div>

      {audioError ? (
        <p role="alert" className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700">
          {audioError}
        </p>
      ) : null}
    </section>
  )
}
