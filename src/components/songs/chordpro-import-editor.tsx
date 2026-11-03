"use client"

import { useMemo, useRef, useState } from "react"
import { Clock3, FileUp, FileText, Columns2 } from "lucide-react"
import { Feedback } from "@/components/ui/feedback"
import { buildSongDisplayLines } from "@/features/chordpro/render"
import { formatAudioTimestamp } from "@/features/chordpro/audio-timestamps"
import { getChordProMetadata, parseChordPro, validateChordPro } from "@/features/chordpro/parser"
import ChordProLine from "./chordpro-line"
import {
  MAX_CHORDPRO_FILE_BYTES,
  validateChordProImport,
} from "@/lib/chordpro-portability"

type ChordProImportEditorProps = {
  source: string
  className?: string
}

function setFieldValue(
  form: HTMLFormElement | null,
  name: string,
  value: string | undefined
) {
  if (!form || !value) {
    return
  }

  const field = form.elements.namedItem(name)

  if (field instanceof HTMLInputElement) {
    field.value = value
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

export default function ChordProImportEditor({
  source,
  className,
}: ChordProImportEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const formSource = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(source)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const parsedSong = useMemo(() => parseChordPro(value), [value])
  const previewLines = useMemo(
    () => buildSongDisplayLines(parsedSong.lines),
    [parsedSong.lines],
  )
  const validation = useMemo(() => validateChordPro(value), [value])
  const metadata = parsedSong.metadata

  async function importFile(file: File | undefined) {
    setError("")
    setMessage("")

    if (!file) {
      return
    }

    if (file.size > MAX_CHORDPRO_FILE_BYTES) {
      setError("ChordPro files must be 500 KB or smaller.")
      return
    }

    let text: string

    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer()
      )
    } catch {
      setError("The selected file is not valid UTF-8 text.")
      return
    }

    const validation = validateChordProImport(
      file.name,
      file.size,
      text
    )

    if (!validation.valid) {
      setError(validation.error ?? "The ChordPro file is invalid.")
      return
    }

    setValue(text)
    setMessage(`Imported ${file.name}. Review the chart before saving.`)

    const form = formSource.current?.form ?? null
    setFieldValue(form, "title", getChordProMetadata(text, "title"))
    setFieldValue(
      form,
      "artist",
      getChordProMetadata(text, "artist") ??
        getChordProMetadata(text, "composer")
    )

    const tempo = getChordProMetadata(text, "tempo")
    if (tempo && /^\d+$/.test(tempo)) {
      setFieldValue(form, "tempo", tempo)
    }

    const timeSignature =
      getChordProMetadata(text, "time_signature") ??
      getChordProMetadata(text, "time")
    if (timeSignature && /^[0-9]{1,2}\/[0-9]{1,2}$/.test(timeSignature)) {
      setFieldValue(form, "timeSignature", timeSignature)
    }

    const capo = getChordProMetadata(text, "capo")
    if (capo && /^\d+$/.test(capo)) {
      setFieldValue(form, "capo", capo)
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--muted)]">
          Import a ChordPro file to replace this chart. Supported: .cho,
          {" "}
          .chopro, .chordpro (500 KB max).
        </p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold transition hover:bg-[var(--surface)]"
        >
          <FileUp className="size-4" />
          Import ChordPro
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".cho,.chopro,.chordpro"
          className="sr-only"
          aria-label="Choose a ChordPro file"
          onChange={(event) => {
            void importFile(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
      </div>
      {error ? (
        <div className="mb-3">
          <Feedback tone="error" title="Import failed">
            {error}
          </Feedback>
        </div>
      ) : null}
      {message ? (
        <div className="mb-3">
          <Feedback tone="success" title="Import complete">
            {message}
          </Feedback>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="min-w-0" aria-labelledby="chordpro-source-title">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label id="chordpro-source-title" htmlFor="chordProSource" className="text-xs font-semibold text-[var(--foreground)]">
              ChordPro source
            </label>
            <span className="text-[10px] text-[var(--muted)]">
              Edit lyrics, chords, and directives
            </span>
          </div>
          <textarea
            ref={formSource}
            id="chordProSource"
            name="chordProSource"
            required
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.currentTarget.value)
              setMessage("")
              setError("")
            }}
            aria-describedby="chordpro-validation"
            className={className}
          />
          <div id="chordpro-validation" role={validation.valid ? "status" : "alert"} aria-live={validation.valid ? "polite" : "assertive"} aria-atomic="true" className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-xs leading-5">
            {validation.valid ? (
              <p className="font-medium text-[var(--success)]">ChordPro syntax looks valid.</p>
            ) : (
              <div>
                <p className="font-semibold text-[var(--danger)]">
                  {validation.errors.length} syntax issue{validation.errors.length === 1 ? "" : "s"} found
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--danger)]">
                  {validation.errors.slice(0, 8).map((validationError) => (
                    <li key={validationError}>{validationError}</li>
                  ))}
                </ul>
                {validation.errors.length > 8 ? <p className="mt-1 text-[var(--danger)]">And {validation.errors.length - 8} more issue(s).</p> : null}
              </div>
            )}
          </div>
        </section>

        <section
          aria-labelledby="chordpro-preview-title"
          aria-label="Rendered song preview"
          className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
        >
          <header className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[var(--brand)]" aria-hidden="true" />
              <h3 id="chordpro-preview-title" className="text-xs font-semibold text-[var(--foreground)]">
                Live chart preview
              </h3>
              <span className="ml-auto text-[10px] text-[var(--muted)]">Updates as you type</span>
            </div>
            <p className="mt-2 break-words text-sm font-semibold text-[var(--foreground)]">
              {metadata.title || "Untitled song"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
              {metadata.artist || metadata.composer ? (
                <span>{metadata.artist || metadata.composer}</span>
              ) : null}
              {metadata.key ? <span>Key {metadata.key}</span> : null}
              {metadata.tempo ? <span>{metadata.tempo} BPM</span> : null}
              {metadata.time_signature || metadata.time ? (
                <span>{metadata.time_signature || metadata.time}</span>
              ) : null}
            </div>
          </header>
          <div className="max-h-[560px] min-h-[380px] overflow-y-auto p-4 sm:p-5">
            {previewLines.length === 0 ? (
              <p className="py-12 text-center text-xs text-[var(--muted)]">
                Start adding lyrics and chords to preview the chart.
              </p>
            ) : (
              <div className="space-y-1">
                {previewLines.map((item, index) => {
                  if (item.type === "blank") {
                    return <div key={"preview-blank-" + index} className="h-3" aria-hidden="true" />
                  }
                  if (item.type === "section") {
                    return (
                      <h4 key={"preview-section-" + index} className="mb-2 mt-5 first:mt-0 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
                        {item.title}
                      </h4>
                    )
                  }
                  if (item.type === "audio_timestamp") {
                    return (
                      <p key={"preview-time-" + index} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--muted)]">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {formatAudioTimestamp(item.seconds)}
                      </p>
                    )
                  }
                  if (item.type === "columns") {
                    return (
                      <p key={"preview-columns-" + index} className="my-2 inline-flex items-center gap-1.5 rounded-md bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--muted)]">
                        <Columns2 className="size-3" aria-hidden="true" />
                        {item.count}-column layout
                      </p>
                    )
                  }
                  if (item.type === "new_page") {
                    return <div key={"preview-page-" + index} className="my-4 border-t border-dashed border-[var(--border)] pt-2 text-[9px] uppercase tracking-wider text-[var(--muted)]">Page break</div>
                  }
                  if (item.type !== "content" || item.line.type !== "content") {
                    return null
                  }
                  if (item.preformatted) {
                    return (
                      <pre key={"preview-pre-" + index} className="overflow-x-auto whitespace-pre rounded-lg bg-[var(--surface)] p-2 font-mono text-[11px] leading-5 text-[var(--foreground)]">
                        {item.line.tokens.map((token) => token.value).join("")}
                      </pre>
                    )
                  }
                  const alignmentClass =
                    item.alignment === "center"
                      ? "justify-center text-center"
                      : item.alignment === "right"
                        ? "justify-end text-right"
                        : "justify-start text-left"
                  return (
                    <div key={"preview-line-" + index} className={"flex min-h-7 w-full " + alignmentClass}>
                      <ChordProLine line={item.line} fontSize={15} showChords />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
