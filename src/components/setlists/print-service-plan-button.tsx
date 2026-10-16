"use client"

import { Printer } from "lucide-react"

export default function PrintServicePlanButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
    >
      <Printer className="size-4" />
      Print / Save as PDF
    </button>
  )
}
