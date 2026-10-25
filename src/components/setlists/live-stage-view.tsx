"use client"

import Link from "next/link"
import {
  House,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  ListMusic,
  Maximize2,
  Minimize2,
  Minus,
  PanelRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { buildSongDisplayLines } from "@/features/chordpro/render"
import { getChordProMetadata, parseChordPro } from "@/features/chordpro/parser"
import { formatAudioTimestamp } from "@/features/chordpro/audio-timestamps"
import {
  getTranspositionBetweenKeys,
  transposeChordProSource,
} from "@/features/chordpro/transpose"
import {
  getBoundedStageIndex,
  type LiveStageSong,
} from "@/lib/live-stage"
import { saveOfflineStageSnapshot } from "@/lib/offline-stage"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import ChordProLine from "@/components/songs/chordpro-line"
import LiveStageServicePanel from "./live-stage-service-panel"

type LiveStageTimelineItem = {
  id: string
  position: number
  item_type: string
  title: string
  duration_minutes: number | null
  notes: string | null
  song_id: string | null
}

type LiveStageTeamMember = {
  id: string
  display_name: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
  response_note: string | null
}

type LiveStageResource = {
  id: string
  display_name: string
  signed_url: string
}

type LiveStageViewProps = {
  setlistId: string
  setlistName: string
  canManageCompletion: boolean
  isServiceCompleted: boolean
  userId: string
  songs: LiveStageSong[]
  referenceAudioUrls?: Record<string, string | null>
  serviceDate: string
  serviceTime: string
  status: string
  description: string | null
  serviceNotes: string | null
  announcements: string | null
  timeline: LiveStageTimelineItem[]
  team: LiveStageTeamMember[]
  resources: LiveStageResource[]
}

export default function LiveStageView({
  setlistId,
  setlistName,
  canManageCompletion,
  isServiceCompleted,
  userId,
  songs,
  referenceAudioUrls = {},
  serviceDate,
  serviceTime,
  status,
  description,
  serviceNotes,
  announcements,
  timeline,
  team,
  resources,
}: LiveStageViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [fontSize, setFontSize] = useState(36)
  const [showChords, setShowChords] = useState(true)
  const [transposeOffset, setTransposeOffset] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineSaved, setOfflineSaved] = useState(false)
  const [offlineSaveError, setOfflineSaveError] = useState<string | null>(null)
  const [showServicePanel, setShowServicePanel] = useState(false)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(2)
  const [countdownDuration, setCountdownDuration] = useState(60)
  const [countdownRemaining, setCountdownRemaining] = useState(60)
  const [countdownRunning, setCountdownRunning] = useState(false)
  const lyricsScrollRef = useRef<HTMLDivElement>(null)
  const referenceAudioRef = useRef<HTMLAudioElement>(null)
  const [audioSeekRequest, setAudioSeekRequest] = useState<{ songId: string; seconds: number; token: number } | null>(null)
  const [audioSeekToken, setAudioSeekToken] = useState(0)
  const currentSong = songs[currentIndex] ?? null
  const currentSongAudioUrl = currentSong ? referenceAudioUrls[currentSong.id] ?? null : null

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    const request = audioSeekRequest
    if (!request || request.songId !== currentSong?.id) return

    const audio = referenceAudioRef.current
    if (!audio) return

    const seek = () => {
      const maxTime = Number.isFinite(audio.duration) ? audio.duration : request.seconds
      audio.currentTime = Math.max(0, Math.min(request.seconds, maxTime))
    }

    if (audio.readyState >= 1) {
      seek()
      return
    }

    audio.addEventListener("loadedmetadata", seek, { once: true })
    return () => audio.removeEventListener("loadedmetadata", seek)
  }, [audioSeekRequest, currentSong?.id, currentSongAudioUrl])

  useEffect(() => {
    let cancelled = false

    const supabase = createBrowserClient()
    supabase.auth.getSession().then(
      ({
        data,
        error,
      }: {
        data: { session: Session | null }
        error: Error | null
      }) => {
        if (error) {
          throw error
        }

        if (data.session?.user.id !== userId) {
          throw new Error(
            "Your session changed; sign in again to save offline charts."
          )
        }

        try {
          localStorage.setItem("worshipflow-offline-user", userId)
        } catch {
          throw new Error("Browser storage is unavailable for offline use.")
        }

        return saveOfflineStageSnapshot({
          setlistId,
          setlistName,
          userId,
          storageKey: `${userId}:${setlistId}`,
          songs,
          savedAt: new Date().toISOString(),
        })
      }
    ).then(
      () => {
        if (!cancelled) {
          setOfflineSaved(true)
          setOfflineSaveError(null)
        }
      },
      (error: unknown) => {
        console.error("Saving offline live-stage charts failed:", error)
        if (!cancelled) {
          setOfflineSaved(false)
          setOfflineSaveError(
            error instanceof Error
              ? error.message
              : "Unable to save this service for offline use."
          )
        }
      }
    )

    return () => {
      cancelled = true
    }
  }, [setlistId, setlistName, userId, songs])

  useEffect(() => {
    if (!countdownRunning || countdownRemaining === 0) return

    const timeoutId = window.setTimeout(() => {
      if (countdownRemaining <= 1) {
        setCountdownRemaining(0)
        setCountdownRunning(false)
      } else {
        setCountdownRemaining(countdownRemaining - 1)
      }
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [countdownRunning, countdownRemaining])

  function formatCountdown(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0")
  }

  const sourceKey = useMemo(
    () => getChordProMetadata(currentSong?.source ?? "", "key") ?? null,
    [currentSong?.source]
  )
  const overrideTranspose = getTranspositionBetweenKeys(
    sourceKey,
    currentSong?.key
  ) ?? 0
  const totalTranspose = overrideTranspose + transposeOffset
  const displayedSource = useMemo(
    () =>
      transposeChordProSource(
        currentSong?.source ?? "",
        totalTranspose
      ),
    [currentSong?.source, totalTranspose]
  )
  const displayLines = useMemo(
    () => buildSongDisplayLines(parseChordPro(displayedSource).lines),
    [displayedSource]
  )
  const displayedKey =
    getChordProMetadata(displayedSource, "key") ??
    currentSong?.key ??
    "—"

  const changeSong = useCallback((offset: number) => {
    const nextIndex = getBoundedStageIndex(
      currentIndex,
      offset,
      songs.length
    )

    if (nextIndex !== null) {
      setAutoScroll(false)
      setCurrentIndex(nextIndex)
      setTransposeOffset(0)
      setCountdownRunning(false)
      setCountdownRemaining(countdownDuration)
    }
  }, [currentIndex, songs.length, countdownDuration])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
      ) {
        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        changeSong(1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        changeSong(-1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [changeSong])

  function cycleScrollSpeed() {
    setScrollSpeed((value) => (value >= 3 ? 1 : value + 1))
  }

  function resetLyricsScroll() {
    setAutoScroll(false)
    lyricsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    if (!autoScroll) return

    const intervalId = window.setInterval(() => {
      const container = lyricsScrollRef.current
      if (!container) return

      const atBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 3

      if (atBottom) {
        setAutoScroll(false)
        return
      }

      container.scrollTop += scrollSpeed
    }, 55)

    return () => window.clearInterval(intervalId)
  }, [autoScroll, scrollSpeed])

  async function toggleFullscreen() {
    setFullscreenError(null)

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      setFullscreenError("Fullscreen mode could not be enabled.")
    }
  }

  const activeSongSummary = songs[currentIndex]
  const songIndexById = useMemo(
    () =>
      songs.reduce<Record<string, number>>((result, song, index) => {
        if (result[song.id] === undefined) {
          result[song.id] = index
        }
        return result
      }, {}),
    [songs]
  )

  const selectTimelineSong = useCallback(
    (songId: string) => {
      const index = songIndexById[songId]
      if (index === undefined) {
        return
      }
      setAutoScroll(false)
      setCurrentIndex(index)
      setTransposeOffset(0)
      setShowServicePanel(false)
    },
    [songIndexById]
  )

  return (
    <main className="fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-[#0d120f] text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70">
            <ListMusic className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-white/50">{setlistName}</p>
            <h1 className="truncate text-sm font-semibold sm:text-base">
              Live stage
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-white/50 sm:inline">
            {songs.length ? currentIndex + 1 : 0} / {songs.length}
          </span>
          <details className="relative">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/75 hover:bg-white/10">
              <Clock className="size-4" />
              <span aria-label="Countdown remaining">{formatCountdown(countdownRemaining)}</span>
            </summary>
            <div className="absolute right-0 top-full z-[220] mt-2 w-64 rounded-2xl border border-white/15 bg-[#17211b] p-4 shadow-2xl">
              <p className="text-sm font-semibold">Transition countdown</p>
              <p className="mt-1 text-xs leading-5 text-white/55">A local timer for rehearsal and transitions. It does not automatically advance the song.</p>
              <label htmlFor="stage-countdown-duration" className="mt-3 block text-xs font-medium text-white/70">Duration</label>
              <select
                id="stage-countdown-duration"
                value={countdownDuration}
                onChange={(event) => {
                  const duration = Number(event.currentTarget.value)
                  setCountdownDuration(duration)
                  setCountdownRemaining(duration)
                  setCountdownRunning(false)
                }}
                className="mt-1.5 h-10 w-full rounded-lg border border-white/15 bg-black/20 px-3 text-sm text-white"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={90}>1 minute 30 seconds</option>
                <option value={180}>3 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
              <p className="mt-3 text-center font-mono text-3xl font-semibold tabular-nums" aria-live="off">{formatCountdown(countdownRemaining)}</p>
              {countdownRemaining === 0 ? <p role="status" className="mt-1 text-center text-xs font-semibold text-amber-200">Countdown complete</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCountdownRunning((running) => !running)} disabled={countdownRemaining === 0} className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-[#17211b] disabled:opacity-40">{countdownRunning ? "Pause" : "Start"}</button>
                <button type="button" onClick={() => { setCountdownRunning(false); setCountdownRemaining(countdownDuration) }} className="h-9 rounded-lg border border-white/15 px-3 text-xs font-semibold text-white/80 hover:bg-white/10">Reset</button>
              </div>
            </div>
          </details>
          <Link
            href="/"
            aria-label="Go to home dashboard"
            title="Go to home dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <House className="size-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold sm:text-xs ${
              isOnline
                ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                : "border-amber-300/25 bg-amber-300/10 text-amber-100"
            }`}
            title={
              offlineSaveError ??
              (offlineSaved
                ? "This service and its song charts are saved on this device for offline use."
                : "Saving this service and its song charts for offline use.")
            }
          >
            {!isOnline ? (
              <WifiOff className="size-3.5" />
            ) : (
              <Wifi className="size-3.5" />
            )}
            <span className="hidden sm:inline">
              {offlineSaveError
                ? "Offline save failed"
                : !isOnline
                  ? "Offline · charts saved"
                  : offlineSaved
                    ? "Saved for offline"
                    : "Saving offline copy"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setShowServicePanel(true)}
            aria-label="Open service panel"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <PanelRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {isFullscreen
              ? <Minimize2 className="size-4" />
              : <Maximize2 className="size-4" />}
          </button>
          <Link
            href={`/setlists/${setlistId}`}
            className="inline-flex h-10 items-center rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            Exit
          </Link>
        </div>
      </header>

      {songs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h2 className="text-2xl font-semibold">No songs in this service</h2>
          <p className="mt-2 max-w-md text-sm text-white/55">
            Add songs to the setlist before starting the live stage view.
          </p>
        </div>
      ) : (
        <>
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4 sm:px-10 sm:py-5">
            <div className="mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col">
              {currentSong ? (
                <>
                  <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                        {currentSong.section} · Song {currentIndex + 1}
                      </p>
                      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
                        {currentSong.title}
                      </h2>
                      {currentSong.artist ? (
                        <p className="mt-2 text-sm text-white/55">
                          {currentSong.artist}
                        </p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                        <span className="rounded-full bg-white/10 px-3 py-1.5">
                          Key {displayedKey}
                          {totalTranspose !== 0
                            ? ` (${totalTranspose > 0 ? "+" : ""}${totalTranspose})`
                            : ""}
                        </span>
                        {currentSong.capo !== null ? (
                          <span className="rounded-full bg-white/10 px-3 py-1.5">
                            Capo {currentSong.capo}
                          </span>
                        ) : null}
                        {currentSong.tempo ? (
                          <span className="rounded-full bg-white/10 px-3 py-1.5">
                            {currentSong.tempo} BPM
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoScroll((value) => !value)}
                        aria-pressed={autoScroll}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
                          autoScroll
                            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                            : "border-white/15 text-white/75 hover:bg-white/10"
                        }`}
                      >
                        {autoScroll ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        {autoScroll ? "Pause scroll" : "Auto-scroll"}
                      </button>
                      <button
                        type="button"
                        onClick={cycleScrollSpeed}
                        aria-label={`Change auto-scroll speed, currently speed ${scrollSpeed}`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                      >
                        <Gauge className="size-3.5" />
                        {scrollSpeed}×
                      </button>
                      <button
                        type="button"
                        onClick={resetLyricsScroll}
                        aria-label="Return to top of lyrics"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowChords((visible) => !visible)}
                        aria-pressed={showChords}
                        className="h-10 rounded-xl border border-white/15 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                      >
                        {showChords ? "Hide chords" : "Show chords"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransposeOffset((offset) => Math.max(-12, offset - 1))}
                        disabled={transposeOffset <= -12}
                        aria-label="Transpose down"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 disabled:opacity-30"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-10 text-center text-xs font-semibold text-white/55">
                        {totalTranspose > 0 ? `+${totalTranspose}` : totalTranspose}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTransposeOffset((offset) => Math.min(12, offset + 1))}
                        disabled={transposeOffset >= 12}
                        aria-label="Transpose up"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 disabled:opacity-30"
                      >
                        <Plus className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize((size) => Math.max(22, size - 2))}
                        disabled={fontSize <= 22}
                        aria-label="Decrease lyrics size"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 disabled:opacity-30"
                      >
                        <span className="text-lg">A−</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize((size) => Math.min(56, size + 2))}
                        disabled={fontSize >= 56}
                        aria-label="Increase lyrics size"
                        className="inline-flex size-10 items-center justify-center rounded-xl border border-white/15 text-white/70 disabled:opacity-30"
                      >
                        <span className="text-lg">A+</span>
                      </button>
                    </div>
                  </div>

                  {currentSong.notes ? (
                    <div className="mb-3 shrink-0 rounded-xl border border-amber-200/20 bg-amber-200/10 px-4 py-3 text-sm leading-6 text-amber-100">
                      <span className="mr-2 font-semibold">Arrangement note</span>
                      {currentSong.notes}
                    </div>
                  ) : null}

                  {currentSongAudioUrl ? (
                    <audio
                      key={currentSong.id}
                      ref={referenceAudioRef}
                      src={currentSongAudioUrl}
                      controls
                      preload="metadata"
                      aria-label={`Reference recording for ${currentSong.title}`}
                      className="mb-3 w-full max-w-2xl shrink-0 self-center rounded-xl"
                    />
                  ) : null}

                  <div
                    key={currentSong.id}
                    ref={lyricsScrollRef}
                    tabIndex={0}
                    aria-label="Live lyrics and chords"
                    className="min-h-0 flex-1 w-full overflow-y-auto overscroll-contain pb-16 pr-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20"
                  >
                    {displayLines.map((line, lineIndex) => {
                        if (line.type === "blank") {
                          return <div key={`blank-${lineIndex}`} className="h-8" aria-hidden="true" />
                        }

                        if (line.type === "audio_timestamp") {
                          return (
                            <div key={`audio-timestamp-${lineIndex}`} className="my-3 flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={!currentSongAudioUrl}
                                onClick={() => {
                                  if (!currentSongAudioUrl || !currentSong) return
                                  const token = audioSeekToken + 1
                                  setAudioSeekToken(token)
                                  setAudioSeekRequest({ songId: currentSong.id, seconds: line.seconds, token })
                                }}
                                aria-label={currentSongAudioUrl ? `Seek reference recording to ${formatAudioTimestamp(line.seconds)}` : `Audio timestamp ${formatAudioTimestamp(line.seconds)}. Attach a reference recording to enable seeking.`}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-45 motion-reduce:transition-none"
                              >
                                <Play className="size-4" aria-hidden="true" />
                                {formatAudioTimestamp(line.seconds)}
                              </button>
                              {!currentSongAudioUrl ? <span className="text-xs text-white/45">Reference recording required</span> : null}
                            </div>
                          )
                        }

                        if (line.type === "section") {
                          return (
                            <p
                              key={`section-${lineIndex}`}
                              className="mb-3 mt-9 text-xs font-bold uppercase tracking-[0.18em] text-white/40 first:mt-0"
                            >
                              {line.title}
                            </p>
                          )
                        }

                        if (line.type === "columns" || line.type === "column_break" || line.type === "new_page") {
                          return null
                        }

                        if (line.type !== "content" || line.line.type !== "content") {
                          return null
                        }

                        if (line.preformatted) {
                          return (
                            <pre key={`tab-${lineIndex}`} className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-4 text-left font-mono text-sm leading-7 text-white/90">
                              {line.line.tokens.map((token) => token.value).join("")}
                            </pre>
                          )
                        }

                        const alignmentClass = line.alignment === "left"
                          ? "justify-start text-left"
                          : line.alignment === "right"
                            ? "justify-end text-right"
                            : "justify-center text-center"

                        return (
                          <div key={`line-${lineIndex}`} className={`flex w-full ${alignmentClass}`}>
                            <ChordProLine
                              line={line.line}
                              fontSize={fontSize}
                              showChords={showChords}
                              stageMode
                            />
                          </div>
                        )
                    })}
                  </div>
                </>
              ) : (
                <p className="m-auto text-center text-sm text-white/55">
                  This song is not available in the loaded service plan.
                </p>
              )}
            </div>
          </section>

          <footer className="shrink-0 border-t border-white/10 bg-black/20 px-4 py-3 sm:px-7">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => changeSong(-1)}
                disabled={currentIndex === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
                Previous
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-xs text-white/40">Up next</p>
                <p className="truncate text-sm font-medium text-white/75">
                  {songs[currentIndex + 1]?.title ?? "End of setlist"}
                </p>
                {fullscreenError ? (
                  <p role="status" className="mt-1 text-xs text-amber-200">
                    {fullscreenError}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => changeSong(1)}
                disabled={currentIndex >= songs.length - 1}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-white/30">
              Use ← and → to navigate songs
              {activeSongSummary ? ` · ${activeSongSummary.title}` : ""}
            </p>
          </footer>
        </>
      )}
      {showServicePanel ? (
        <LiveStageServicePanel
          setlistId={setlistId}
          canManageCompletion={canManageCompletion}
          isServiceCompleted={isServiceCompleted}
          serviceDate={serviceDate}
          serviceTime={serviceTime}
          status={status}
          description={description}
          serviceNotes={serviceNotes}
          announcements={announcements}
          timeline={timeline}
          team={team}
          resources={resources}
          currentSongId={currentSong?.id ?? null}
          songIndexById={songIndexById}
          onSelectSong={selectTimelineSong}
          onClose={() => setShowServicePanel(false)}
        />
      ) : null}
    </main>
  )
}
