import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react"
import FaqSearchList from "@/components/faq-search-list"
import { faqItems } from "@/lib/faq"

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Find answers about WorshipFlow songs, chords, service planning, schedules, team communication, and workspace settings.",
  alternates: {
    canonical: "/faq",
  },
}

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        <ArrowLeft className="size-4" />
        Back to WorshipFlow
      </Link>

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#152b20] via-[#244a35] to-[#365c45] px-5 py-7 text-white shadow-[0_18px_45px_-28px_rgba(21,43,32,0.7)] sm:px-9 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -right-16 -top-32 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-20 size-64 rounded-full border border-white/10" />
          <div className="absolute -bottom-40 left-[28%] size-72 rounded-full border border-white/[0.07]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.1),transparent_58%)]" />
        </div>

        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">
            <BookOpen className="size-3.5" />
            WorshipFlow support
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            How can we help?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
            Search common questions about preparing songs, planning services,
            and staying connected with your worship team.
          </p>
        </div>
      </section>

      <section
        aria-label="Frequently asked questions"
        className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6"
      >
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            Frequently asked questions
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Start typing to filter answers instantly. Search by a question,
            feature, or keyword.
          </p>
        </div>
        <FaqSearchList />
      </section>

      <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Still need help?
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Ask your worship team in Team Chat if you need help with a
              specific service or workspace task.
            </p>
          </div>
        </div>
        <Link
          href="/chat"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
        >
          <MessageCircle className="size-4" />
          Contact my team
        </Link>
      </section>
    </main>
  )
}
