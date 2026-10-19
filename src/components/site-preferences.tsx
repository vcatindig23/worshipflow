"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"

export default function SitePreferences() {
  const [cookieVisible, setCookieVisible] = useState(false)

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("worshipflow-theme")
      const nextTheme = storedTheme === "dark" ? "dark" : "light"
      document.documentElement.dataset.theme = nextTheme
      // Intentional preference hydration during mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCookieVisible(window.localStorage.getItem("worshipflow-cookie-notice") !== "accepted")
    } catch {
      document.documentElement.dataset.theme = "light"
    }

    const mainContent = document.getElementById("main-content") ?? document.querySelector("main")
    if (mainContent && !mainContent.id) mainContent.id = "main-content"
  }, [])

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
