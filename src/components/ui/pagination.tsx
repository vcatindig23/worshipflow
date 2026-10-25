import Link from "next/link"
import type { ReactNode } from "react"
import { buttonVariants } from "./button"

export function Pagination({
  label,
  summary,
  previousHref,
  nextHref,
}: {
  label: string
  summary: ReactNode
  previousHref?: string
  nextHref?: string
}) {
  return (
    <nav
      aria-label={label}
      className="wf-card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-[var(--muted)]">{summary}</p>
      <div className="flex items-center gap-2">
        {previousHref ? (
          <Link
            rel="prev"
            href={previousHref}
            className={buttonVariants({ variant: "outline" })}
          >
            Previous
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({
              variant: "outline",
              className: "opacity-40",
            })}
          >
            Previous
          </span>
        )}
        {nextHref ? (
          <Link rel="next" href={nextHref} className={buttonVariants()}>
            Next
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({ className: "opacity-40" })}
          >
            Next
          </span>
        )}
      </div>
    </nav>
  )
}
