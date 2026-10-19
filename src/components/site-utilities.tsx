"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowUp, BookOpen, HelpCircle, MessageCircle, X } from "lucide-react"

const FaqSearchList = dynamic(() => import("@/components/faq-search-list"), {
  ssr: false,
  loading: () => (
    <div aria-label="Loading help content" className="space-y-2 py-2">
      <div className="h-10 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="h-12 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="h-12 animate-pulse rounded-xl bg-[var(--surface)]" />
    </div>
  ),
})

export default function SiteUtilities() {
  const pathname = usePathname()
  const [helpOpen, setHelpOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigationTimerRef = useRef<number | null>(null)

  useEffect(() => {
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

  useEffect(() => {
    const clearNavigationProgress = () => {
      delete document.documentElement.dataset.wfNavigationLoading
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
        navigationTimerRef.current = null
      }
    }

    const handleNavigationClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const clickedElement =
        event.target instanceof Element ? event.target : null
      const link = clickedElement?.closest("a")
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("data-no-progress")
      ) {
        return
      }

      let destination: URL
      try {
        destination = new URL(link.href, window.location.href)
      } catch {
        return
      }

      if (destination.origin !== window.location.origin) return
      if (destination.pathname === window.location.pathname) {
        return
      }

      document.documentElement.dataset.wfNavigationLoading = "true"
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
      navigationTimerRef.current = window.setTimeout(
        clearNavigationProgress,
        12000,
      )
    }

    const handleFormSubmit = (event: SubmitEvent) => {
      const form = event.target
      const button = event.submitter
      if (
        !(form instanceof HTMLFormElement) ||
        !(button instanceof HTMLButtonElement) ||
        form.method.toLowerCase() === "get" ||
        form.hasAttribute("data-no-loading-feedback") ||
        button.disabled ||
        button.hasAttribute("data-no-loading-feedback")
      ) {
        return
      }

      const previousBusyValue = button.getAttribute("aria-busy")
      let timeoutId: number | null = null
      let observer: MutationObserver | null = null
      let cleared = false

      const clearPendingState = () => {
        if (cleared) return
        cleared = true
        if (timeoutId !== null) window.clearTimeout(timeoutId)
        observer?.disconnect()
        form.removeEventListener("input", clearPendingState)
        form.removeEventListener("change", clearPendingState)
        button.classList.remove("wf-action-loading")
        if (previousBusyValue === null) {
          button.removeAttribute("aria-busy")
        } else {
          button.setAttribute("aria-busy", previousBusyValue)
        }
      }

      button.classList.add("wf-action-loading")
      button.setAttribute("aria-busy", "true")
      form.addEventListener("input", clearPendingState, { once: true })
      form.addEventListener("change", clearPendingState, { once: true })
      timeoutId = window.setTimeout(clearPendingState, 20000)
      observer = new MutationObserver(clearPendingState)
      observer.observe(form.parentElement ?? form, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }

    document.addEventListener("click", handleNavigationClick, true)
    document.addEventListener("submit", handleFormSubmit, true)

    return () => {
      document.removeEventListener("click", handleNavigationClick, true)
      document.removeEventListener("submit", handleFormSubmit, true)
      clearNavigationProgress()
    }
  }, [])

  useEffect(() => {
    if (document.documentElement.dataset.wfNavigationLoading !== "true") return
    delete document.documentElement.dataset.wfNavigationLoading
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current)
      navigationTimerRef.current = null
    }
  }, [pathname])

  return (
    <>
      <div aria-hidden="true" className="wf-scroll-progress" style={{ transform: `scaleX(${progress / 100})` }} />
      <div aria-hidden="true" className="wf-navigation-progress" />

      {pathname === "/settings" ? <div className="wf-help-widget fixed bottom-4 left-4 z-[65] sm:bottom-6 sm:left-6">
        {helpOpen ? (
          <section aria-label="WorshipFlow help" className="mb-3 max-h-[85vh] w-[min(90vw,360px)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Quick help</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Common WorshipFlow questions</p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Close help" className="rounded-lg p-2 hover:bg-[var(--surface)]">
                <X className="size-4" />
              </button>
            </div>
            <div className="px-4 py-4">
              <FaqSearchList compact />
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <Link
                href="/faq"
                onClick={() => setHelpOpen(false)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)]/40 hover:text-[var(--brand)]"
              >
                <BookOpen className="size-4" /> Browse all FAQs
              </Link>
              <Link
                href="/chat"
                onClick={() => setHelpOpen(false)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                <MessageCircle className="size-4" /> Contact my team
              </Link>
            </div>
          </section>
        ) : null}
        <button type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-label={helpOpen ? "Close help and FAQ" : "Open help and FAQ"} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2">
          {helpOpen ? <X className="size-4" /> : <HelpCircle className="size-4" />}
          <span>Help</span>
        </button>
      </div> : null}

      {showTop ? (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll back to top" title="Back to top" className="wf-back-to-top fixed bottom-20 right-4 z-[60] inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:bottom-20 sm:right-6">
          <ArrowUp className="size-4" />
        </button>
      ) : null}

    </>
  )
}
