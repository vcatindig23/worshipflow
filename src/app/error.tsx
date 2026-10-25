"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (error.digest) {
      console.error("WorshipFlow application error", { digest: error.digest })
    }
  }, [error])

  return (
    <>
        <main
          id="main-content"
          className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12 text-[var(--foreground)]"
        >
          <section
            aria-labelledby="global-error-title"
            className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-center shadow-sm sm:p-10"
          >
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-600">
              <AlertTriangle aria-hidden="true" className="size-7" />
            </div>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
              Something interrupted your workspace
            </p>
            <h1
              id="global-error-title"
              className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              This page didn’t load as expected
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Your work may still be saved. You can try loading this page again
              or return to WorshipFlow and continue from there.
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Return to WorshipFlow
              </Link>
            </div>

            {error.digest ? (
              <p className="mt-6 text-xs text-[var(--muted)]">
                Reference: <code className="font-mono">{error.digest}</code>
              </p>
            ) : null}
          </section>
        </main>
    </>
  )
}
