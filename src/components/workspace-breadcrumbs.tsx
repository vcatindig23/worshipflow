"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, House } from "lucide-react"
import { buildWorkspaceBreadcrumbs } from "@/lib/workspace-breadcrumbs"

export default function WorkspaceBreadcrumbs({
  currentLabel,
}: {
  currentLabel?: string
}) {
  const pathname = usePathname()
  const items = buildWorkspaceBreadcrumbs(pathname, currentLabel)
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs leading-6 text-[var(--muted)]"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)]"
          >
            <House className="size-3.5" aria-hidden="true" />
            Dashboard
          </Link>
        </li>
        {items.map((item) => (
          <li
            key={item.href}
            className="inline-flex min-w-0 items-center gap-2"
          >
            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
            {item.current ? (
              <span
                aria-current="page"
                className="max-w-[min(55vw,24rem)] truncate font-medium text-[var(--foreground)]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="max-w-[min(55vw,24rem)] truncate hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
