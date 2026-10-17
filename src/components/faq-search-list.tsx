"use client"

import { useId, useMemo, useState } from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { faqItems, searchFaqItems } from "@/lib/faq"

type FaqSearchListProps = {
  compact?: boolean
}

export default function FaqSearchList({
  compact = false,
}: FaqSearchListProps) {
  const [query, setQuery] = useState("")
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const id = useId()
  const searchInputId = `faq-search-${id}`
  const resultsId = `faq-results-${id}`
  const filteredItems = useMemo(() => searchFaqItems(query), [query])
  const hasQuery = query.trim().length > 0

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="relative">
        <label htmlFor={searchInputId} className="sr-only">
          Search frequently asked questions
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
        />
        <input
          id={searchInputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions or keywords..."
          autoComplete="off"
          aria-controls={resultsId}
          className={`h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-11 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand)]/10 ${compact ? "h-11" : ""}`}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setOpenQuestion(null)
            }}
            aria-label="Clear FAQ search"
            className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="text-xs text-[var(--muted)]"
      >
        {hasQuery
          ? `${filteredItems.length} ${filteredItems.length === 1 ? "result" : "results"} for “${query.trim()}”`
          : `${faqItems.length} frequently asked questions`}
      </p>

      {filteredItems.length ? (
        <div
          id={resultsId}
          className={`space-y-2 ${compact ? "max-h-[min(35vh,260px)] overflow-y-auto pr-1" : ""}`}
        >
          {filteredItems.map((item) => {
            const isOpen = openQuestion === item.id
            const answerId = `${id}-faq-answer-${item.id}`
            const triggerId = `${id}-faq-question-${item.id}`

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] transition-colors"
              >
                <h3>
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() =>
                      setOpenQuestion((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)] sm:px-4"
                  >
                    <span className="min-w-0 flex-1">
                      {!compact ? (
                        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--brand)]">
                          {item.category}
                        </span>
                      ) : null}
                      <span className="block text-sm font-semibold leading-5 text-[var(--foreground)]">
                        {item.question}
                      </span>
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`size-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={answerId}
                  role="region"
                  aria-labelledby={triggerId}
                  hidden={!isOpen}
                  className="border-t border-[var(--border)]"
                >
                  <div className="px-4 py-3.5">
                    {compact ? (
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
                        {item.category}
                      </p>
                    ) : null}
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center">
          <Search className="mx-auto size-5 text-[var(--muted)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
            No matching questions
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Try another keyword, or clear your search to browse all FAQs.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  )
}
