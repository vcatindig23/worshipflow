"use client"

import { Minus, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { buildSongDisplayLines } from "@/features/chordpro/render"
import { parseChordPro } from "@/features/chordpro/parser"

type SongViewerProps = {
  source: string
}

export default function SongViewer({
  source,
}: SongViewerProps) {
  const [fontSize, setFontSize] = useState(18)
  const [showChords, setShowChords] = useState(true)

  const parsedSong = useMemo(
    () => parseChordPro(source),
    [source]
  )

  const displayLines = useMemo(
    () => buildSongDisplayLines(parsedSong.lines),
    [parsedSong.lines]
  )

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <div className="text-xs font-medium text-[var(--muted)]">
          Song chart
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowChords((value) => !value)}
            className={`h-9 rounded-lg border px-3 text-xs font-semibold transition ${
              showChords
                ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-dark)]"
                : "border-[var(--border)] bg-white text-[var(--muted)]"
            }`}
          >
            Chords
          </button>

          <button
            type="button"
            aria-label="Decrease font size"
            disabled={fontSize <= 14}
            onClick={() => setFontSize((value) => Math.max(14, value - 2))}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>

          <span className="min-w-12 text-center text-xs font-semibold text-[var(--muted)]">
            {fontSize}
          </span>

          <button
            type="button"
            aria-label="Increase font size"
            disabled={fontSize >= 32}
            onClick={() => setFontSize((value) => Math.min(32, value + 2))}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto px-5 py-7 sm:px-8 sm:py-9"
        style={{
          fontSize: `${fontSize}px`,
        }}
      >
        <div className="mx-auto max-w-4xl">
          {displayLines.map((item, index) => {
            if (item.type === "blank") {
              return (
                <div
                  key={`blank-${index}`}
                  className="h-5"
                  aria-hidden="true"
                />
              )
            }

            if (item.type === "section") {
              return (
                <div
                  key={`section-${index}`}
                  className="mb-3 mt-8 first:mt-0 text-[0.62em] font-bold uppercase tracking-[0.16em] text-[var(--brand)]"
                >
                  {item.title}
                </div>
              )
            }

            if (!item.line || item.line.type !== "content") {
              return null
            }

            return (
              <div
                key={`line-${index}`}
                className="min-h-[1.8em] whitespace-pre-wrap font-medium leading-[1.9]"
              >
                {item.line.tokens.map((token, tokenIndex) => {
                  if (token.type === "text") {
                    return (
                      <span key={`text-${tokenIndex}`}>
                        {token.value || " "}
                      </span>
                    )
                  }

                  return (
                    <span
                      key={`chord-${tokenIndex}`}
                      className="inline-block align-top"
                    >
                      {showChords ? (
                        <span className="block min-h-[1em] font-semibold leading-none text-[0.65em] text-[var(--brand)]">
                          {token.value}
                        </span>
                      ) : (
                        <span className="block min-h-[1em] opacity-0">
                          {token.value}
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}