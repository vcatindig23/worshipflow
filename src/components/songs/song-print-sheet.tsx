"use client"

import { useMemo, useState } from "react"
import { Printer, Minus, Plus } from "lucide-react"
import { parseChordPro } from "@/features/chordpro/parser"
import { formatAudioTimestamp, parseAudioTimestamp } from "@/features/chordpro/audio-timestamps"

type SongPrintSheetProps = {
  source: string
  title: string
  artist: string | null
  currentKey: string | null
  tempo: number | null
  timeSignature: string | null
  capo: number | null
}

export default function SongPrintSheet({
  source,
  title,
  artist,
  currentKey,
  tempo,
  timeSignature,
  capo,
}: SongPrintSheetProps) {
  const [columns, setColumns] = useState<1 | 2>(1)
  const [fontSize, setFontSize] = useState(14)
  const [showChords, setShowChords] = useState(true)
  const [template, setTemplate] = useState("personal")
  const [defaultSaved, setDefaultSaved] = useState(false)

  function applyTemplate(value: string) {
    setTemplate(value)
    setDefaultSaved(false)
    if (value === "personal") {
      setColumns(1)
      setFontSize(14)
      setShowChords(true)
    } else if (value === "rehearsal") {
      setColumns(2)
      setFontSize(11)
      setShowChords(true)
    } else if (value === "stage") {
      setColumns(1)
      setFontSize(20)
      setShowChords(true)
    }
  }

  function loadDefaultTemplate() {
    try {
      const saved = window.localStorage.getItem("worshipflow-song-print-template")
      if (!saved) return
      const preferences = JSON.parse(saved) as { columns?: number; fontSize?: number; showChords?: boolean }
      if (preferences.columns === 1 || preferences.columns === 2) setColumns(preferences.columns)
      if (typeof preferences.fontSize === "number" && preferences.fontSize >= 9 && preferences.fontSize <= 20) setFontSize(preferences.fontSize)
      if (typeof preferences.showChords === "boolean") setShowChords(preferences.showChords)
      setTemplate("custom")
      setDefaultSaved(false)
    } catch {
      setDefaultSaved(false)
    }
  }

  function saveDefaultTemplate() {
    try {
      window.localStorage.setItem("worshipflow-song-print-template", JSON.stringify({ columns, fontSize, showChords }))
      setTemplate("custom")
      setDefaultSaved(true)
    } catch {
      setDefaultSaved(false)
    }
  }
  const parsed = useMemo(() => parseChordPro(source), [source])
  const alignment: { value: "left" | "center" | "right" } = { value: "left" }
  const tabMode: { value: boolean } = { value: false }

  return (
    <main className="wf-song-print-page mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="wf-song-print-controls mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Print chord sheet</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Adjust the layout, then print or save as PDF from your browser.</p>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]">
            <Printer className="size-4" />
            Print / Save PDF
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="print-template" className="mb-2 block text-xs font-semibold text-[var(--muted)]">Layout template</label>
            <select id="print-template" value={template} onChange={(event) => { if (event.target.value === "custom") loadDefaultTemplate(); else applyTemplate(event.target.value) }} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              <option value="personal">Personal reading</option>
              <option value="rehearsal">Rehearsal</option>
              <option value="stage">Stage</option>
              <option value="custom">Custom saved default</option>
            </select>
          </div>
          <div>
            <label htmlFor="print-columns" className="mb-2 block text-xs font-semibold text-[var(--muted)]">Page columns</label>
            <select id="print-columns" value={columns} onChange={(event) => { setColumns(Number(event.target.value) as 1 | 2); setTemplate("custom"); setDefaultSaved(false) }} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
              <option value={1}>Single column</option>
              <option value={2}>Two columns</option>
            </select>
          </div>
          <div>
            <label htmlFor="print-font-size" className="mb-2 block text-xs font-semibold text-[var(--muted)]">Lyrics size: {fontSize} pt</label>
            <div className="flex h-10 items-center gap-3 rounded-lg border border-[var(--border)] px-3">
              <button type="button" aria-label="Decrease print font size" onClick={() => { setFontSize((size) => Math.max(9, size - 1)); setTemplate("custom"); setDefaultSaved(false) }} disabled={fontSize <= 9}><Minus className="size-4" /></button>
              <input id="print-font-size" aria-label="Print font size" type="range" min={9} max={20} value={fontSize} onChange={(event) => { setFontSize(Number(event.target.value)); setTemplate("custom"); setDefaultSaved(false) }} className="w-full" />
              <button type="button" aria-label="Increase print font size" onClick={() => { setFontSize((size) => Math.min(20, size + 1)); setTemplate("custom"); setDefaultSaved(false) }} disabled={fontSize >= 20}><Plus className="size-4" /></button>
            </div>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
            <input type="checkbox" checked={showChords} onChange={(event) => { setShowChords(event.target.checked); setTemplate("custom"); setDefaultSaved(false) }} className="size-4 accent-[var(--brand)]" />
            Include chords
          </label>
          <div className="flex flex-col justify-end gap-1">
            <button type="button" onClick={saveDefaultTemplate} className="h-10 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--surface)]">Save current layout as default</button>
            {defaultSaved ? <p role="status" className="text-xs text-emerald-700">Default layout saved on this device.</p> : null}
          </div>
        </div>
      </div>

      <article className="wf-song-print-sheet rounded-2xl border border-[var(--border)] bg-white p-6 text-black shadow-sm sm:p-10" style={{ fontSize: fontSize + "pt", columnCount: columns, columnGap: "2rem" }}>
        <header className="wf-song-print-header mb-6 border-b border-black/15 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {artist ? <p className="mt-1 text-sm text-black/65">{artist}</p> : null}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/65">
            {currentKey ? <span>Key: {currentKey}</span> : null}
            {tempo ? <span>{tempo} BPM</span> : null}
            {timeSignature ? <span>Time: {timeSignature}</span> : null}
            {capo !== null ? <span>Capo: {capo}</span> : null}
          </div>
        </header>

        <div className="wf-song-print-content">
          {parsed.lines.map((line, index) => {
            if (line.type === "blank") return <div key={"blank-" + index} className="h-3" aria-hidden="true" />
            if (line.type === "directive") {
              if (/^start_of_(verse|chorus|bridge|pre_chorus|intro|outro|tag|interlude|tab|grid)(_\d+)?$/.test(line.name)) {
                if (line.name === "start_of_tab" || line.name === "start_of_grid") tabMode.value = true
                const label = line.name.replace("start_of_", "").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
                return <h2 key={"section-" + index} className="wf-song-print-section my-3 break-after-avoid text-[0.78em] font-bold uppercase tracking-widest text-black/60">{label}</h2>
              }
              if (line.name === "audio_timestamp" && line.value !== null) {
                const seconds = parseAudioTimestamp(line.value)
                if (seconds === null) return null
                return <p key={"audio-timestamp-" + index} className="wf-song-print-cue my-2 break-inside-avoid text-[0.7em] font-semibold tracking-wide text-black/55">Recording cue: <span className="text-black">{formatAudioTimestamp(seconds)}</span></p>
              }
              if ((line.name === "align" || line.name === "text_align") && line.value && ["left", "center", "right"].includes(line.value.toLowerCase())) {
                alignment.value = line.value.toLowerCase() as "left" | "center" | "right"
                return null
              }
              if (line.name === "start_of_tab" || line.name === "start_of_grid") {
                tabMode.value = true
                return null
              }
              if (line.name === "end_of_tab" || line.name === "end_of_grid") {
                tabMode.value = false
                return null
              }
              if (line.name === "column_break") return <div key={"column-" + index} className="wf-song-print-column-break" />
              if (line.name === "new_page") return <div key={"page-" + index} className="wf-song-print-page-break" />
              return null
            }
            return (
              <div key={"line-" + index} className={"wf-song-print-line " + (tabMode.value ? "wf-song-print-tab " : "")} style={{ textAlign: alignment.value }}>
                {line.tokens.map((token, tokenIndex) => token.type === "text" ? (
                  <span key={"text-" + tokenIndex}>{token.value}</span>
                ) : showChords ? (
                  <span key={"chord-" + tokenIndex} className="wf-song-print-chord-anchor">
                    <span className="wf-song-print-chord">{token.value}</span>
                  </span>
                ) : null)}
              </div>
            )
          })}
        </div>
      </article>
    </main>
  )
}
