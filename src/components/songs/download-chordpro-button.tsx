"use client"

import { Download } from "lucide-react"
import {
  buildChordProExport,
  getChordProDownloadName,
} from "@/lib/chordpro-portability"

type DownloadChordProButtonProps = {
  source: string
  title: string
  artist: string | null
}

export default function DownloadChordProButton({
  source,
  title,
  artist,
}: DownloadChordProButtonProps) {
  function download() {
    const file = new Blob(
      [buildChordProExport(source, title, artist)],
      { type: "text/plain;charset=utf-8" }
    )
    const url = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = getChordProDownloadName(title)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
    >
      <Download className="size-4" />
      Export .cho
    </button>
  )
}
