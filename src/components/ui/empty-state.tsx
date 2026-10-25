import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function EmptyState({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: string
  description: ReactNode
  icon: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "wf-card flex flex-col items-center border-dashed px-5 py-12 text-center sm:py-16",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-ink)]"
      >
        {icon}
      </div>
      <h2 className="wf-section-title">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {actions ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
