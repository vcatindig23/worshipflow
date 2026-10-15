import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, House, Search } from "lucide-react"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The WorshipFlow page you requested could not be found.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]">
      <div className="w-full max-w-lg text-center">
        <Link href="/" className="mb-12 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
          <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white"><WorshipFlowLogo className="size-7" /></span>
          <span className="text-lg font-semibold tracking-tight">WorshipFlow</span>
        </Link>
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)] text-[var(--brand)] shadow-sm"><Search className="size-9" strokeWidth={1.5} /></div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">We can’t find that page</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">The link may be outdated, or the page may have moved. Let’s get you back to your worship workspace.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"><House className="size-4" /> Go to dashboard</Link>
          <Link href="/songs" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"><ArrowLeft className="size-4" /> Browse songs</Link>
        </div>
      </div>
    </main>
  )
}
