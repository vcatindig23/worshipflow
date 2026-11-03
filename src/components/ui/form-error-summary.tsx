"use client"

import { CircleAlert } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"

type FormErrorSummaryProps = {
  title: string
  children: ReactNode
}

/**
 * Announces and moves keyboard focus to a form-level error after a server
 * response or navigation. Field-level native validation remains responsible
 * for focusing individual invalid controls.
 */
export function FormErrorSummary({ title, children }: FormErrorSummaryProps) {
  const summaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    summaryRef.current?.focus()
  }, [])

  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      data-form-error-summary
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2"
    >
      <div role="alert" className="wf-feedback wf-feedback-error">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <div className="mt-1 text-sm leading-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
