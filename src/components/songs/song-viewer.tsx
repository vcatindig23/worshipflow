"use client"

import {
  Gauge,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { buildSongDisplayLines } from "@/features/chordpro/render"
import {
  getChordProMetadata,
  parseChordPro,
} from "@/features/chordpro/parser"
import { transposeChordProSource } from "@/features/chordpro/transpose"
import ChordProLine from "./chordpro-line"

type SongViewerProps = {
  source: string
  title?: string
}

export default function SongViewer({
  source,
  title = "Song chart",
}: SongViewerProps) {
  const [fontSize, setFontSize] = useState(24)
  const [showChords, setShowChords] = useState(true)
  const [transposeAmount, setTransposeAmount] = useState(0)
  const [capo, setCapo] = useState(0)
  const [stageMode, setStageMode] = useState(false)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(2)
  const chartScrollRef = useRef<HTMLDivElement>(null)

  const displayedSource = useMemo(
    () => transposeChordProSource(source, transposeAmount),
    [source, transposeAmount]
  )

  const parsedSong = useMemo(
    () => parseChordPro(displayedSource),
    [displayedSource]
  )

  const displayLines = useMemo(
    () => buildSongDisplayLines(parsedSong.lines),
    [parsedSong.lines]
  )

  const displayedKey =
    getChordProMetadata(displayedSource, "key") ?? "—"

  useEffect(() => {
    if (!stageMode) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAutoScroll(false)
        setStageMode(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [stageMode])

  useEffect(() => {
    document.body.style.overflow = stageMode ? "hidden" : ""

    return () => {
      document.body.style.overflow = ""
    }
  }, [stageMode])

  function increaseTranspose() {
    setTransposeAmount((value) => Math.min(12, value + 1))
  }

  function decreaseTranspose() {
    setTransposeAmount((value) => Math.max(-12, value - 1))
  }

  function resetTranspose() {
    setTransposeAmount(0)
  }

  function changeCapo(value: number) {
    setCapo(Math.max(0, Math.min(12, value)))
  }

  function resetChartPosition() {
    setAutoScroll(false)
    chartScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cycleScrollSpeed() {
    setScrollSpeed((value) => (value >= 3 ? 1 : value + 1))
  }

  // Always scroll the lyrics viewport, never the document/window.
  useEffect(() => {
    if (!autoScroll) return

    const intervalId = window.setInterval(() => {
      const container = chartScrollRef.current
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
  }, [autoScroll, scrollSpeed, stageMode])

  const chart = (
    <div
      ref={chartScrollRef}
      aria-label={stageMode ? "Stage mode lyrics and chords" : "Song lyrics and chords"}
      tabIndex={0}
      className={`min-h-0 min-w-0 overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]/40 ${
        stageMode
          ? "flex-1 overflow-auto bg-[#0d120f] px-6 py-8 text-white sm:px-10 sm:py-10"
          : "h-[calc(100dvh-170px)] min-h-[360px] overflow-auto px-5 py-7 sm:px-8 sm:py-9"
      }`}
    >
      <div
        className={`mx-auto w-full max-w-none ${
          stageMode ? "mx-auto max-w-[1500px] pb-14 text-center" : "pb-8"
        }`}
      >
        {displayLines.map((item, index) => {
          if (item.type === "blank") {
            return (
              <div
                key={`blank-${index}`}
                className={stageMode ? "h-7" : "h-5"}
                aria-hidden="true"
              />
            )
          }

          if (item.type === "section") {
            return (
              <div
                key={`section-${index}`}
                className={`mb-3 mt-8 first:mt-0 text-[0.68em] font-bold uppercase tracking-[0.16em] ${
                  stageMode
                    ? "text-white/45"
                    : "text-[var(--brand)]"
                }`}
              >
                {item.title}
              </div>
            )
          }

          if (!item.line || item.line.type !== "content") {
            return null
          }

          return (
            <ChordProLine
              key={`line-${index}`}
              line={item.line}
              fontSize={fontSize}
              showChords={showChords}
              stageMode={stageMode}
            />
          )
        })}
      </div>
    </div>
  )

  if (stageMode) {
    return (
      <div className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[#0d120f] text-white">
        <header className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#0d120f] px-3 py-3 sm:gap-5 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              Stage Mode
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55 sm:gap-3 sm:text-sm">
              <span>Key {displayedKey}</span>
              <span aria-hidden="true">•</span>
              <span>
                Transpose {transposeAmount >= 0 ? "+" : ""}
                {transposeAmount}
              </span>
              <span aria-hidden="true">•</span>
              <span>Capo {capo}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoScroll((value) => !value)}
                aria-pressed={autoScroll}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                  autoScroll
                    ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-200"
                    : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {autoScroll ? (
                  <Pause className="size-3.5" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {autoScroll ? "Pause scroll" : "Auto-scroll"}
              </button>
              <button
                type="button"
                onClick={cycleScrollSpeed}
                aria-label={`Change auto-scroll speed, currently speed ${scrollSpeed}`}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <Gauge className="size-3.5" />
                Speed {scrollSpeed}×
              </button>
              <button
                type="button"
                onClick={resetChartPosition}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="size-3.5" />
                Back to top
              </button>
              <button
                type="button"
                onClick={() => setFontSize((value) => Math.max(14, value - 2))}
                disabled={fontSize <= 14}
                aria-label="Decrease lyrics size"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 text-white/70 transition hover:bg-white/10 disabled:opacity-30"
              >
                <Minus className="size-4" />
              </button>
              <span
                aria-label={`Lyrics font size ${fontSize} pixels`}
                className="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border border-white/10 px-2 text-xs tabular-nums text-white/65"
              >
                {fontSize}px
              </span>
              <button
                type="button"
                onClick={() => setFontSize((value) => Math.min(40, value + 2))}
                disabled={fontSize >= 40}
                aria-label="Increase lyrics size"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 text-white/70 transition hover:bg-white/10 disabled:opacity-30"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setAutoScroll(false)
              setStageMode(false)
            }}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Exit Stage Mode"
          >
            <X className="size-5" />
          </button>
        </header>

        {chart}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className="z-10 flex shrink-0 flex-col gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <div className="text-xs font-medium text-[var(--muted)]">
            Song chart
          </div>

          <div className="mt-1 text-sm font-semibold">
            Key {displayedKey}
            {transposeAmount !== 0 ? (
              <span className="ml-2 font-normal text-[var(--muted)]">
                ({transposeAmount > 0 ? "+" : ""}
                {transposeAmount})
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoScroll((value) => !value)}
            aria-pressed={autoScroll}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
              autoScroll
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface)]"
            }`}
          >
            {autoScroll ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="size-3.5" />
            )}
            {autoScroll ? "Pause scroll" : "Auto-scroll"}
          </button>

          <button
            type="button"
            onClick={cycleScrollSpeed}
            title="Change auto-scroll speed"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)]"
          >
            <Gauge className="size-3.5" />
            {scrollSpeed}×
          </button>

          <button
            type="button"
            onClick={resetChartPosition}
            aria-label="Return to top of chart"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)]"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowChords((value) => !value)}
            aria-pressed={showChords}
            className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${
              showChords
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                : "border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
          >
            {showChords ? "Hide chords" : "Show chords"}
          </button>

          <button
            type="button"
            onClick={decreaseTranspose}
            disabled={transposeAmount <= -12}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Transpose down"
          >
            <Minus className="size-4" />
          </button>

          <button
            type="button"
            onClick={resetTranspose}
            className="min-w-12 rounded-lg border border-[var(--border)] px-2 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)]"
            aria-label="Reset transposition"
            title="Reset transposition"
          >
            {transposeAmount > 0 ? `+${transposeAmount}` : transposeAmount}
          </button>

          <button
            type="button"
            onClick={increaseTranspose}
            disabled={transposeAmount >= 12}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Transpose up"
          >
            <Plus className="size-4" />
          </button>

          <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)]">
            <button
              type="button"
              onClick={() => changeCapo(capo - 1)}
              disabled={capo === 0}
              className="px-2.5 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:opacity-40"
              aria-label="Decrease capo"
            >
              −
            </button>

            <div className="border-x border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--foreground)]">
              Capo {capo}
            </div>

            <button
              type="button"
              onClick={() => changeCapo(capo + 1)}
              disabled={capo === 12}
              className="px-2.5 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:opacity-40"
              aria-label="Increase capo"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFontSize((value) => Math.max(14, value - 2))}
            disabled={fontSize <= 14}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:opacity-40"
            aria-label="Decrease lyrics size"
          >
            <Minus className="size-4" />
          </button>

          <span className="min-w-10 text-center text-xs font-semibold text-[var(--muted)]">
            {fontSize}px
          </span>

          <button
            type="button"
            onClick={() => setFontSize((value) => Math.min(32, value + 2))}
            disabled={fontSize >= 32}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:opacity-40"
            aria-label="Increase lyrics size"
          >
            <Plus className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setStageMode(true)}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Stage Mode
          </button>
        </div>
      </div>

      {chart}
    </div>
  )
}
