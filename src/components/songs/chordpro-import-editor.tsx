"use client"

import { useRef, useState } from "react"
import { FileUp } from "lucide-react"
import {
  getChordProMetadata,
} from "@/features/chordpro/parser"
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
    <div>
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
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
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
        className={className}
      />
    </div>
  )
}
