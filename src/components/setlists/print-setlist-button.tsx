"use client"

import { Printer } from "lucide-react"

export default function PrintSetlistButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
    >
      <Printer className="size-4" />
      Print
    </button>
  )
}
