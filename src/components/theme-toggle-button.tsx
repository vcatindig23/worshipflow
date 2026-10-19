"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"
type ThemeToggleButtonProps = {
  variant?: "sidebar" | "card"
  className?: string
}

const THEME_CHANGED_EVENT = "worshipflow:theme-changed"

export default function ThemeToggleButton({
  variant = "sidebar",
  className = "",
}: ThemeToggleButtonProps) {
  const [theme, setTheme] = useState<Theme>("light")
  const ThemeIcon = theme === "dark" ? Sun : Moon
  const actionLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("worshipflow-theme")
      const nextTheme: Theme = storedTheme === "dark" ? "dark" : "light"
      // Intentional client-side preference hydration; keep the server render deterministic.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
    } catch {
      document.documentElement.dataset.theme = "light"
    }

    function syncTheme(event: Event) {
      const nextTheme = (event as CustomEvent<{ theme?: Theme }>).detail?.theme
      if (nextTheme === "light" || nextTheme === "dark") {
        setTheme(nextTheme)
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== "worshipflow-theme") return
      const nextTheme: Theme = event.newValue === "dark" ? "dark" : "light"
      setTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
    }

    window.addEventListener(THEME_CHANGED_EVENT, syncTheme)
    window.addEventListener("storage", handleStorage)

    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, syncTheme)
      window.removeEventListener("storage", handleStorage)
    }
  }, [])

  function toggleTheme() {
    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : theme
    const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark"

    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme

    try {
      window.localStorage.setItem("worshipflow-theme", nextTheme)
    } catch {
      // Keep the selected theme for this page when storage is unavailable.
    }

    window.dispatchEvent(
      new CustomEvent(THEME_CHANGED_EVENT, { detail: { theme: nextTheme } })
    )
  }

  const buttonClasses =
    variant === "card"
      ? "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)]/40 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
      : "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--sidebar-muted)] transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={actionLabel}
      title={actionLabel}
      className={`${buttonClasses} ${className}`.trim()}
    >
      {variant === "sidebar" ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg transition group-hover:bg-white/10">
          <ThemeIcon aria-hidden="true" className="wf-icon-motion size-[18px]" />
        </span>
      ) : (
        <ThemeIcon aria-hidden="true" className="wf-icon-motion size-4" />
      )}
      <span>{actionLabel}</span>
    </button>
  )
}
