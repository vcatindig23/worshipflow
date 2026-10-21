import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BookOpen, ShieldCheck } from "lucide-react"

export type LegalSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export default function PublicLegalPage({
  title,
  eyebrow,
  introduction,
  sections,
}: {
  title: string
  eyebrow: string
  introduction: string
  sections: LegalSection[]
}) {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 sm:py-10"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to WorshipFlow
          </Link>
          <nav aria-label="Legal navigation" className="flex flex-wrap items-center gap-1">
            <Link
              href="/privacy"
              aria-current={title === "Privacy Policy" ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              aria-current={title === "Terms of Service" ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Terms
            </Link>
            <Link
              href="/faq"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Help Center
            </Link>
          </nav>
        </div>

        <header className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#152b20] via-[#244a35] to-[#365c45] px-5 py-7 text-white shadow-[0_18px_45px_-28px_rgba(21,43,32,0.7)] sm:px-9 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-16 -top-32 size-80 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-20 size-64 rounded-full border border-white/10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.1),transparent_58%)]" />
          </div>
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">
              {title === "Privacy Policy" ? (
                <ShieldCheck aria-hidden="true" className="size-3.5" />
              ) : (
                <BookOpen aria-hidden="true" className="size-3.5" />
              )}
              {eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
              {introduction}
            </p>
            <p className="mt-5 text-xs font-medium text-white/65">
              Effective date: October 21, 2026
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start">
          <article className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-8">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  aria-labelledby={`legal-section-${index}`}
                  className="scroll-mt-6"
                >
                  <h2
                    id={`legal-section-${index}`}
                    className="text-base font-semibold tracking-tight sm:text-lg"
                  >
                    {section.title}
                  </h2>
                  <div className="mt-2 space-y-3 text-sm leading-7 text-[var(--muted)]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets ? (
                      <ul className="list-disc space-y-2 pl-5 marker:text-[var(--brand)]">
                        {section.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-sm font-semibold">Related links</h2>
            <div className="mt-3 flex flex-col gap-1">
              <Link
                href="/faq"
                className="inline-flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                Help Center
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--brand-soft)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                Create an account
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">
              For account and privacy questions, contact the project maintainer
              through the available GitHub contact channels. Do not post passwords,
              private files, or personal account details in public issues.
            </p>
            <Link
              href="https://github.com/vcatindig23"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-[var(--brand)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Project maintainer on GitHub
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 px-1 py-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>WorshipFlow · A shared home for your worship team</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/privacy" className="rounded underline-offset-4 hover:text-[var(--foreground)] hover:underline">Privacy</Link>
            <Link href="/terms" className="rounded underline-offset-4 hover:text-[var(--foreground)] hover:underline">Terms</Link>
            <Link href="/faq" className="rounded underline-offset-4 hover:text-[var(--foreground)] hover:underline">Help Center</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
