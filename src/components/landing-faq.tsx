import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"
import { faqItems } from "@/lib/faq"

const landingFaqIds = new Set([
  "assigned-services",
  "manage-songs",
  "chords-transpose",
  "create-service",
])

const landingFaqItems = faqItems.filter((item) => landingFaqIds.has(item.id))

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: landingFaqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export default function LandingFaq() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />

      <section
        id="landing-faq"
        aria-labelledby="landing-faq-title"
        className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8 sm:pb-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            Here to help
          </p>
          <h2
            id="landing-faq-title"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl"
          >
            Questions before you get started?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
            A few quick answers to help your worship team find its rhythm.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {landingFaqItems.map((item) => (
            <details
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]/85 shadow-sm transition-colors open:border-[var(--brand)]/35"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 text-left marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] sm:px-5">
                <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-[var(--foreground)] sm:text-base">
                  {item.question}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {item.answer}
                </p>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-7 flex justify-center">
          <Link
            href="/faq"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/40 hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
          >
            Browse all help questions
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
