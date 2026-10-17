"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"

type EmailAuthDisclosureProps = {
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function EmailAuthDisclosure({
  children,
  defaultOpen = false,
}: EmailAuthDisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = useId()

  return (
    <div>
      <div className="my-5 flex items-center gap-3">
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
        >
          <span>or continue with email</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        <span aria-hidden="true" className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {isOpen ? (
        <div id={contentId} className="animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      ) : null}
    </div>
  )
}
