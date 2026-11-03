"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { Feedback } from "./feedback"

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
      <Feedback tone="error" title={title}>
        {children}
      </Feedback>
    </div>
  )
}
