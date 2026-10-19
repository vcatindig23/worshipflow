"use client"

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import { ArrowRight, Check, Compass, X } from "lucide-react"

type TourStep = {
  title: string
  description: string
  selector: string
  mobileSelector?: string
}

type TourLayout = {
  spotlight: { left: number; top: number; width: number; height: number }
  tooltip: { left: number; top: number; width: number }
  placement: "above" | "below"
}

const TOUR_VERSION = "v1"

const tourSteps: TourStep[] = [
  {
    title: "Welcome to your worship workspace",
    description:
      "This dashboard gives you a quick overview of your church workspace and the work coming up. Your personal tour starts here.",
    selector: '[data-tour="dashboard-welcome"]',
  },
  {
    title: "Find your way around",
    description:
      "Use the workspace navigation to open Songs, Setlists, Services, My Schedule, your Profile, team tools, and files.",
    selector: '[data-tour="sidebar-navigation"]',
    mobileSelector: '[data-tour="mobile-navigation"]',
  },
  {
    title: "Your workspace at a glance",
    description:
      "These summary cards show your song library, team size, default service, and the role you have in this workspace.",
    selector: '[data-tour="workspace-overview"]',
  },
  {
    title: "Build your song library",
    description:
      "Add a song with lyrics, chords, key, tempo, and other details your team needs to prepare and perform together.",
    selector: '[data-tour="create-song"]',
  },
  {
    title: "Prepare your setlist",
    description:
      "Arrange songs and shape the flow of a worship service. You can add service details and coordinate assignments as you go.",
    selector: '[data-tour="build-setlist"]',
  },
  {
    title: "Stay ahead of team priorities",
    description:
      "Keep an eye on service readiness and pending team confirmations, and use My Schedule to review your own commitments.",
    selector: '[data-tour="team-priorities"]',
  },
]

function findVisibleTarget(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector)

  for (const element of elements) {
    const style = window.getComputedStyle(element)
    if (
      element.isConnected &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    ) {
      return element
    }
  }

  return null
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

function calculateTourLayout(
  rect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
): TourLayout {
  const padding = 8
  const spotlightWidth = Math.min(rect.width + padding * 2, viewportWidth - 16)
  const spotlightHeight = Math.min(rect.height + padding * 2, viewportHeight - 16)
  const spotlightLeft = clamp(
    rect.left - padding,
    8,
    viewportWidth - spotlightWidth - 8,
  )
  const spotlightTop = clamp(
    rect.top - padding,
    8,
    viewportHeight - spotlightHeight - 8,
  )
  const spotlight = {
    left: spotlightLeft,
    top: spotlightTop,
    width: spotlightWidth,
    height: spotlightHeight,
  }

  const tooltipWidth = Math.min(360, viewportWidth - 32)
  const estimatedTooltipHeight = 260
  const gap = 18
  const roomBelow = viewportHeight - (spotlight.top + spotlight.height) - gap
  const roomAbove = spotlight.top - gap
  const placement: TourLayout["placement"] =
    roomBelow >= estimatedTooltipHeight || roomBelow >= roomAbove
      ? "below"
      : "above"

  const desiredTop =
    placement === "below"
      ? spotlight.top + spotlight.height + gap
      : spotlight.top - estimatedTooltipHeight - gap
  const tooltip = {
    left: clamp(
      spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      16,
      viewportWidth - tooltipWidth - 16,
    ),
    top: clamp(desiredTop, 12, viewportHeight - estimatedTooltipHeight - 12),
    width: tooltipWidth,
  }

  return { spotlight, tooltip, placement }
}

export default function DashboardGuidedTour({
  userId,
}: {
  userId: string
}) {
  const headingId = useId()
  const launchButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [layout, setLayout] = useState<TourLayout | null>(null)

  const storageKey = `worshipflow-dashboard-tour-${TOUR_VERSION}:${userId}`
  const currentStep = tourSteps[stepIndex]
  const isLastStep = stepIndex === tourSteps.length - 1

  useEffect(() => {
    let completed = false
    try {
      completed = window.localStorage.getItem(storageKey) === "completed"
    } catch {
      // The tour remains available from its button when browser storage is blocked.
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    if (!completed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true)
    }
  }, [storageKey])

  const finishTour = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "completed")
    } catch {
      // The tour can still be dismissed for the current visit.
    }
    setOpen(false)
    setLayout(null)
    window.requestAnimationFrame(() => launchButtonRef.current?.focus())
  }, [storageKey])

  const goToNextStep = useCallback(() => {
    if (stepIndex >= tourSteps.length - 1) {
      finishTour()
      return
    }
    setLayout(null)
    setStepIndex((index) => Math.min(index + 1, tourSteps.length - 1))
  }, [finishTour, stepIndex])

  useEffect(() => {
    if (!mounted || !open) return

    const selector =
      window.innerWidth < 1024 && currentStep.mobileSelector
        ? currentStep.mobileSelector
        : currentStep.selector
    const target = findVisibleTarget(selector)

    if (!target) {
      setLayout(null)
      return
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    })

    const updatePosition = () => {
      const visibleTarget = findVisibleTarget(selector)
      if (!visibleTarget) {
        setLayout(null)
        return
      }

      setLayout(
        calculateTourLayout(
          visibleTarget.getBoundingClientRect(),
          window.innerWidth,
          window.innerHeight,
        ),
      )
    }

    const initialFrame = window.requestAnimationFrame(updatePosition)
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.cancelAnimationFrame(initialFrame)
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [currentStep, mounted, open, stepIndex])

  useEffect(() => {
    if (!open || !layout) return
    const frame = window.requestAnimationFrame(() =>
      nextButtonRef.current?.focus({ preventScroll: true }),
    )
    return () => window.cancelAnimationFrame(frame)
  }, [layout, open, stepIndex])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        finishTour()
        return
      }

      if (event.key === "ArrowRight" && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        goToNextStep()
        return
      }

      if (event.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable.item(0)
      const last = focusable.item(focusable.length - 1)
      if (!first || !last) {
        event.preventDefault()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [finishTour, goToNextStep, open])

  function startTour() {
    setStepIndex(0)
    setLayout(null)
    setOpen(true)
  }

  return (
    <>
      <button
        ref={launchButtonRef}
        type="button"
        onClick={startTour}
        aria-label="Take the WorshipFlow tour"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] sm:self-center"
      >
        <Compass aria-hidden="true" className="size-4 text-[var(--brand)]" />
        Take a tour
      </button>

      {mounted && open && layout
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                className="fixed z-[180] pointer-events-auto"
                style={{
                  left: 0,
                  top: 0,
                  width: "100vw",
                  height: layout.spotlight.top,
                  background: "rgba(10, 18, 13, 0.64)",
                }}
              />
              <div
                aria-hidden="true"
                className="fixed z-[180] pointer-events-auto"
                style={{
                  left: 0,
                  top: layout.spotlight.top,
                  width: layout.spotlight.left,
                  height: layout.spotlight.height,
                  background: "rgba(10, 18, 13, 0.64)",
                }}
              />
              <div
                aria-hidden="true"
                className="fixed z-[180] pointer-events-auto"
                style={{
                  left: layout.spotlight.left + layout.spotlight.width,
                  top: layout.spotlight.top,
                  width:
                    window.innerWidth -
                    layout.spotlight.left -
                    layout.spotlight.width,
                  height: layout.spotlight.height,
                  background: "rgba(10, 18, 13, 0.64)",
                }}
              />
              <div
                aria-hidden="true"
                className="fixed z-[180] pointer-events-auto"
                style={{
                  left: 0,
                  top: layout.spotlight.top + layout.spotlight.height,
                  width: "100vw",
                  height:
                    window.innerHeight -
                    layout.spotlight.top -
                    layout.spotlight.height,
                  background: "rgba(10, 18, 13, 0.64)",
                }}
              />

              <div
                aria-hidden="true"
                className="fixed z-[181] rounded-2xl border-2 border-[#9cc6a7] transition-[left,top,width,height] duration-150"
                style={{
                  left: layout.spotlight.left,
                  top: layout.spotlight.top,
                  width: layout.spotlight.width,
                  height: layout.spotlight.height,
                  boxShadow:
                    "0 0 0 1px rgba(16, 39, 24, 0.35), 0 0 24px rgba(156, 198, 167, 0.18)",
                  background: "transparent",
                  pointerEvents: "auto",
                }}
              />

              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={headingId}
                aria-describedby={`${headingId}-description`}
                className="fixed z-[182] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.55)] sm:p-6"
                style={{
                  left: layout.tooltip.left,
                  top: layout.tooltip.top,
                  width: layout.tooltip.width,
                }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute ${layout.placement === "below" ? "-top-2 border-l border-t" : "-bottom-2 border-r border-b"} left-9 size-4 rotate-45 border-[var(--border)] bg-[var(--card)]`}
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)] sm:text-[11px]">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--brand-soft)]">
                      <Compass aria-hidden="true" className="size-4" />
                    </span>
                    Workspace tour
                  </div>
                  <button
                    type="button"
                    onClick={finishTour}
                    aria-label="Skip tour"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-[var(--muted)]">
                    Step {stepIndex + 1} of {tourSteps.length}
                  </p>
                  <div
                    className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface)]"
                    aria-label={`Tour progress: step ${stepIndex + 1} of ${tourSteps.length}`}
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={tourSteps.length}
                    aria-valuenow={stepIndex + 1}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-200"
                      style={{
                        width: `${((stepIndex + 1) / tourSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <h2
                  id={headingId}
                  className="mt-3 text-lg font-semibold leading-snug tracking-[-0.025em] sm:text-xl"
                >
                  {currentStep.title}
                </h2>
                <p
                  id={`${headingId}-description`}
                  className="mt-2 text-sm leading-6 text-[var(--muted)]"
                >
                  {currentStep.description}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={finishTour}
                    className="rounded-lg px-2 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                  >
                    Skip tour
                  </button>
                  <button
                    ref={nextButtonRef}
                    type="button"
                    onClick={goToNextStep}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
                  >
                    {isLastStep ? (
                      <>
                        Finish tour
                        <Check aria-hidden="true" className="size-4" />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-center text-[10px] text-[var(--muted)]">
                  Press Esc to close or → to continue
                </p>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
