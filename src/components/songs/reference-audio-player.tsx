"use client"

import { useRef, useState } from "react"
import {
  AudioLines,
  Headphones,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
} from "lucide-react"

type ReferenceAudioPlayerProps = {
  src: string
  title: string
  dark?: boolean
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  return minutes + ":" + String(wholeSeconds % 60).padStart(2, "0")
}

export default function ReferenceAudioPlayer({
  src,
  title,
  dark = false,
}: ReferenceAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [repeatTrack, setRepeatTrack] = useState(false)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  const [error, setError] = useState("")

  const sectionLoopActive =
    loopStart !== null && loopEnd !== null && loopEnd > loopStart

  const border = dark ? "border-white/10" : "border-[var(--border)]"
  const foreground = dark ? "text-white" : "text-[var(--foreground)]"
  const muted = dark ? "text-white/55" : "text-[var(--muted)]"
  const subtleSurface = dark ? "bg-white/5" : "bg-[var(--surface)]"
  const secondaryButton = dark
    ? "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"

  async function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return

    setError("")
    if (!audio.paused) {
      audio.pause()
      return
    }

    try {
      await audio.play()
    } catch {
      setError("Audio could not start. Check your connection and browser audio permissions, then try again.")
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return

    if (
      sectionLoopActive &&
      loopEnd !== null &&
      loopStart !== null &&
      audio.currentTime >= loopEnd
    ) {
      audio.currentTime = loopStart
      setCurrentTime(loopStart)
      return
    }

    setCurrentTime(audio.currentTime)
  }

  function handleSeek(value: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
    setError("")
  }

  function markLoopStart() {
    const position = audioRef.current?.currentTime ?? currentTime
    setRepeatTrack(false)
    setLoopStart(position)
    setLoopEnd(null)
    setError("")
  }

  function markLoopEnd() {
    const position = audioRef.current?.currentTime ?? currentTime
    if (loopStart === null) {
      setError("Set the A point before setting the B point.")
      return
    }
    if (position <= loopStart + 0.25) {
      setError("The B point must be at least a quarter-second after the A point.")
      return
    }

    setLoopEnd(position)
    setRepeatTrack(false)
    setError("")
  }

  function resetLoop() {
    setLoopStart(null)
    setLoopEnd(null)
    setRepeatTrack(false)
    setError("")
  }

  function toggleTrackRepeat() {
    const nextValue = !repeatTrack
    setRepeatTrack(nextValue)
    if (nextValue) {
      setLoopStart(null)
      setLoopEnd(null)
    }
    setError("")
  }

  function handlePlaybackRateChange(value: string) {
    const nextRate = Number(value)
    const audio = audioRef.current
    if (!Number.isFinite(nextRate)) return
    setPlaybackRate(nextRate)
    if (audio) audio.playbackRate = nextRate
  }

  return (
    <section
      aria-label="Reference audio player"
      className={"rounded-2xl border p-4 sm:p-5 " + border + " " + (dark ? "bg-[#17221b]" : "bg-[var(--card)]")}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        loop={repeatTrack}
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0)
          setCurrentTime(event.currentTarget.currentTime)
        }}
        onDurationChange={(event) => {
          const nextDuration = event.currentTarget.duration
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0)
        }}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        onError={() => setError("The reference audio could not be loaded. It may have expired or been removed; refresh the page and try again.")}
      />

      <div className="flex items-start gap-3">
        <div className={"flex size-10 shrink-0 items-center justify-center rounded-xl " + subtleSurface + " " + foreground}>
          <AudioLines className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={"text-xs font-semibold uppercase tracking-[0.14em] " + muted}>Reference audio</p>
          <h3 className={"mt-1 truncate text-sm font-semibold " + foreground} title={title}>{title}</h3>
          <p className={"mt-1 text-xs " + muted}>Slow the track down, loop a section, and practice along with the chord chart.</p>
        </div>
        <div className={"hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold sm:inline-flex " + subtleSurface + " " + muted}>
          <Headphones className="size-3.5" />
          Practice
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="reference-audio-seek" className="sr-only">Seek through reference audio</label>
        <input
          id="reference-audio-seek"
          type="range"
          min={0}
          max={Math.max(0.1, duration)}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          disabled={!duration}
          onChange={(event) => handleSeek(Number(event.currentTarget.value))}
          className="h-8 w-full cursor-pointer touch-pan-x accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-45"
        />
        <div className={"mt-1.5 flex items-center justify-between text-[11px] tabular-nums " + muted}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pause reference audio" : "Play reference audio"}
            className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)] sm:h-10"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : "Play audio"}
          </button>
          <button
            type="button"
            onClick={() => handleSeek(0)}
            aria-label="Restart reference audio"
            className={"inline-flex size-11 items-center justify-center rounded-xl border sm:size-10 " + secondaryButton}
          >
            <RotateCcw className="size-4" />
          </button>
        </div>

        <label className={"flex items-center gap-2 text-xs font-medium " + muted}>
          Speed
          <select
            value={playbackRate}
            onChange={(event) => handlePlaybackRateChange(event.currentTarget.value)}
            aria-label="Reference audio playback speed"
            className={"h-11 rounded-lg border px-2.5 text-xs font-semibold outline-none focus:border-[var(--brand)] sm:h-9 " + secondaryButton}
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </div>

      <div className={"mt-4 border-t pt-4 " + border}>
        <div className="flex items-center gap-2">
          <Repeat2 className={"size-4 " + muted} />
          <p className={"text-xs font-semibold " + foreground}>Loop practice</p>
          {sectionLoopActive ? (
            <span className={"ml-auto rounded-full px-2 py-1 text-[10px] font-semibold " + subtleSurface + " " + muted}>
              A {formatTime(loopStart!)}–B {formatTime(loopEnd!)}
            </span>
          ) : repeatTrack ? (
            <span className={"ml-auto rounded-full px-2 py-1 text-[10px] font-semibold " + subtleSurface + " " + muted}>Full track</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleTrackRepeat}
            aria-pressed={repeatTrack}
            className={"inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold sm:h-9 " + (repeatTrack ? (dark ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200" : "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]") : secondaryButton)}
          >
            <Repeat2 className="size-3.5" />
            Repeat track
          </button>
          <button
            type="button"
            onClick={markLoopStart}
            disabled={repeatTrack || !duration}
            aria-pressed={loopStart !== null}
            className={"inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 " + (loopStart !== null && !repeatTrack ? (dark ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200" : "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]") : secondaryButton)}
          >
            <span className="font-bold">A</span> Set loop start
          </button>
          <button
            type="button"
            onClick={markLoopEnd}
            disabled={repeatTrack || loopStart === null || !duration}
            aria-pressed={sectionLoopActive}
            className={"inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 " + (sectionLoopActive ? (dark ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200" : "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]") : secondaryButton)}
          >
            <span className="font-bold">B</span> Set loop end
          </button>
          <button
            type="button"
            onClick={resetLoop}
            disabled={!sectionLoopActive && loopStart === null && !repeatTrack}
            className={"inline-flex h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 " + secondaryButton}
          >
            <RotateCcw className="size-3.5" />
            Clear loop
          </button>
        </div>
        <p className={"mt-2 text-[11px] leading-5 " + muted}>
          Set A at the beginning of a section and B at its end to repeat only that part.
        </p>
      </div>

      {error ? (
        <p role="alert" className={"mt-3 rounded-lg border px-3 py-2 text-xs " + (dark ? "border-rose-300/20 bg-rose-300/10 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700")}>
          {error}
        </p>
      ) : null}
    </section>
  )
}
