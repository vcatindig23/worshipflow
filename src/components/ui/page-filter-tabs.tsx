"use client"

import Link from "next/link"

export type PageFilterTab = {
  value: string
  label: string
  href: string
}

type PageFilterTabsProps = {
  ariaLabel: string
  activeValue: string
  items: PageFilterTab[]
}

export function PageFilterTabs({
  ariaLabel,
  activeValue,
  items,
}: PageFilterTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="w-full sm:w-fit">
      <div className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 sm:w-fit">
        {items.map((item) => {
          const active = item.value === activeValue

          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                "inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:flex-none sm:px-4 " +
                (active
                  ? "bg-[var(--card)] text-[var(--brand-ink)] shadow-sm ring-1 ring-[var(--border)]"
                  : "text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]")
              }
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
