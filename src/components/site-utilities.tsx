"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUp, Check, HelpCircle, MessageCircle, Moon, Sun, X } from "lucide-react"

const faqItems = [
  {
    question: "Where can I find my assigned services?",
    answer: "Open My Schedule to review your upcoming assignments and respond to invitations.",
  },
  {
    question: "How do I manage songs and setlists?",
    answer: "Use Songs to manage chord charts and lyrics, then add songs to a setlist or service plan.",
  },
  {
    question: "How can I contact my team?",
    answer: "Open Team Chat to message your worship team and coordinate service details.",
  },
]

export default function SiteUtilities() {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [cookieVisible, setCookieVisible] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("worshipflow-theme")
      const nextTheme = storedTheme === "dark" ? "dark" : "light"
      setTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
      setCookieVisible(window.localStorage.getItem("worshipflow-cookie-notice") !== "accepted")
    } catch {
      document.documentElement.dataset.theme = "light"
    }

    const mainContent = document.getElementById("main-content") ?? document.querySelector("main")
    if (mainContent && !mainContent.id) mainContent.id = "main-content"

    const updateScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setProgress(scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0)
      setShowTop(window.scrollY > 480)
    }
    updateScroll()
    window.addEventListener("scroll", updateScroll, { passive: true })
    window.addEventListener("resize", updateScroll)
    return () => {
      window.removeEventListener("scroll", updateScroll)
      window.removeEventListener("resize", updateScroll)
    }
  }, [])

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    try {
      window.localStorage.setItem("worshipflow-theme", nextTheme)
    } catch {
      // Keep the selected theme for the current page if storage is unavailable.
    }
  }

  function acceptCookieNotice() {
    setCookieVisible(false)
    try {
      window.localStorage.setItem("worshipflow-cookie-notice", "accepted")
    } catch {
      // The notice can still be dismissed for this session.
    }
  }

  return (
    <>
      <a href="#main-content" className="wf-skip-link">Skip to main content</a>
      <div aria-hidden="true" className="wf-scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} />

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="wf-theme-toggle fixed bottom-20 left-4 z-[70] inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:left-6"
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <div className="wf-help-widget fixed bottom-4 left-4 z-[65] sm:bottom-6 sm:left-6">
        {helpOpen ? (
          <section aria-label="WorshipFlow help" className="mb-3 w-[min(90vw,360px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Quick help</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Common WorshipFlow questions</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close help" className="rounded-lg p-2 hover:bg-[var(--surface)]">
                <X className="size-4" />
              </button>
            </div>
            <div className="divide-y divide-[var(--border)] px-4">
              {faqItems.map((item) => (
                <details key={item.question} className="py-3">
                  <summary className="cursor-pointer text-sm font-medium marker:text-[var(--brand)]">{item.question}</summary>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.answer}</p>
                </details>
              ))}
            </div>
            <Link href="/chat" onClick={() => setHelpOpen(false)} className="m-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]">
              <MessageCircle className="size-4" /> Contact my team
            </Link>
          </section>
        ) : null}
        <button type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-label={helpOpen ? "Close help and FAQ" : "Open help and FAQ"} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          {helpOpen ? <X className="size-4" /> : <HelpCircle className="size-4" />}
          <span>Help</span>
        </button>
      </div>

      {showTop ? (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll back to top" title="Back to top" className="wf-back-to-top fixed bottom-20 right-4 z-[60] inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:bottom-20 sm:right-6">
          <ArrowUp className="size-4" />
        </button>
      ) : null}

      {cookieVisible ? (
        <aside aria-label="Cookie notice" className="wf-cookie-notice fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--foreground)] shadow-2xl sm:inset-x-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold">A simple cookie notice</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">WorshipFlow uses essential browser storage for preferences and app functionality. This notice does not enable advertising cookies.</p>
          </div>
          <button type="button" onClick={acceptCookieNotice} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]">
            <Check className="size-4" /> Got it
          </button>
        </aside>
      ) : null}
    </>
  )
}
