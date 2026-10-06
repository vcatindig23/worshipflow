"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House } from "lucide-react"

export default function HomeButton() {
  const pathname = usePathname()

  if (pathname === "/") {
    return null
  }

  return (
    <Link
      href="/"
      aria-label="Go to home dashboard"
      title="Go to home dashboard"
      className="fixed bottom-4 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-lg transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:bottom-6 sm:right-6"
    >
      <House className="size-4" />
      <span>Home</span>
    </Link>
  )
}
