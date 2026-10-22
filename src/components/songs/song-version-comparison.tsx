"use client"

import { useMemo, useState } from "react"
import { ArrowLeftRight, GitCompareArrows } from "lucide-react"
import { compareChordProSources } from "@/features/chordpro/compare"

type SongVersion = {
  id: string
  version_number: number
  title: string
  created_at: string
  chordpro_source: string
}

type SongVersionComparisonProps = {
  currentSource: string
  versions: SongVersion[]
}

export default function SongVersionComparison({
  currentSource,
  versions,
}: SongVersionComparisonProps) {
  const [versionId, setVersionId] = useState(versions[0]?.id ?? "")
  const [showUnchanged, setShowUnchanged] = useState(false)
  const selectedVersion = versions.find((version) => version.id === versionId)
  const comparisons = useMemo(
    () => selectedVersion ? compareChordProSources(currentSource, selectedVersion.chordpro_source) : [],
    [currentSource, selectedVersion],
  )
  const changedCount = comparisons.filter((line) => line.status !== "same").length
  const visibleLines = showUnchanged ? comparisons : comparisons.filter((line) => line.status !== "same")

  if (versions.length === 0) return null

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6" aria-labelledby="song-version-comparison-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <GitCompareArrows className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">Arrangement review</p>
          </div>
          <h2 id="song-version-comparison-title" className="mt-2 text-lg font-semibold">Compare song versions</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Review chord and lyric source changes against the current arrangement.</p>
        </div>
        <label className="min-w-48 flex-1 sm:max-w-xs">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Previous version</span>
          <select value={versionId} onChange={(event) => setVersionId(event.target.value)} className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]">
            {versions.map((version) => (
              <option key={version.id} value={version.id}>Version {version.version_number} · {new Date(version.created_at).toLocaleDateString()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-3.5 py-3">
        <p className="text-sm font-medium" aria-live="polite">{changedCount} line{changedCount === 1 ? "" : "s"} differ by line position</p>
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
          <input type="checkbox" checked={showUnchanged} onChange={(event) => setShowUnchanged(event.target.checked)} className="size-4 accent-[var(--brand)]" />
          Show unchanged lines
        </label>
      </div>

      {changedCount === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          These arrangements are identical line by line.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {visibleLines.map((line) => (
            <div key={line.lineNumber} className={"grid gap-2 rounded-xl border p-3 sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] " + (line.status === "same" ? "border-[var(--border)]" : "border-amber-300/70 bg-amber-50/50")}>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] sm:block">
                <span>Line {line.lineNumber}</span>
                <span className="sm:mt-1 sm:block">{line.status === "same" ? "Same" : line.status === "changed" ? "Changed" : line.status === "current-only" ? "Added" : "Removed"}</span>
              </div>
              <div className="min-w-0 rounded-lg bg-[var(--card)] p-2.5">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Current</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--foreground)]">{line.current || " "}</pre>
              </div>
              <div className="min-w-0 rounded-lg bg-[var(--card)] p-2.5">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]"><ArrowLeftRight className="size-3" /> Previous</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--foreground)]">{line.previous || " "}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">This review aligns source lines by position; inserting or removing a line can shift later comparisons. Nothing is changed or saved by comparing.</p>
    </section>
  )
}
