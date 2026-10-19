import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  LibraryBig,
  ListMusic,
  RadioTower,
} from "lucide-react"

const workflowSteps = [
  {
    number: "01",
    icon: LibraryBig,
    title: "Prepare your song library",
    description:
      "Keep lyrics, chords, keys, tempos, and reference recordings together so every musician can prepare from the same chart.",
    details: ["Chord charts in one place", "Transposition and practice tools"],
  },
  {
    number: "02",
    icon: ListMusic,
    title: "Build the service plan",
    description:
      "Arrange the setlist and run of show, assign worship and production roles, and keep rehearsals, notes, and resources connected.",
    details: ["Clear order and team assignments", "Preparation tasks and confirmations"],
  },
  {
    number: "03",
    icon: RadioTower,
    title: "Lead together, then review",
    description:
      "Use Live Stage during the service, then record completion details and review past services to help your team prepare for next time.",
    details: ["Focused song charts for the stage", "Service history and team insights"],
  },
]

export default function LandingHowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="relative z-10 mx-auto w-full max-w-7xl scroll-mt-8 px-5 pb-16 sm:px-8 sm:pb-24"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
          A clearer rhythm
        </p>
        <h2
          id="how-it-works-title"
          className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl"
        >
          From song prep to service review.
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
          Bring the work before, during, and after worship into one connected flow.
        </p>
      </div>

      <ol className="mx-auto mt-8 grid max-w-6xl gap-4 md:mt-10 md:grid-cols-3">
        {workflowSteps.map(({ number, icon: Icon, title, description, details }) => (
          <li
            key={number}
            className="group relative flex h-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--card)]/85 p-5 shadow-[0_16px_48px_-32px_rgba(23,32,27,0.28)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)]/35 hover:shadow-lg sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tabular-nums tracking-[0.16em] text-[var(--muted)]">
                STEP {number}
              </span>
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] transition-transform duration-200 group-hover:scale-105">
                <Icon aria-hidden="true" className="size-5" />
              </span>
            </div>

            <h3 className="mt-5 text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {description}
            </p>

            <ul className="mt-5 space-y-2.5 border-t border-[var(--border)] pt-4">
              {details.map((detail) => (
                <li
                  key={detail}
                  className="flex items-start gap-2.5 text-xs font-medium leading-5 text-[var(--foreground)] sm:text-sm"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-[var(--brand)]"
                  />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/signup"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
        >
          Start your workspace
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link
          href="/faq"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
        >
          Explore the Help Center
        </Link>
      </div>
    </section>
  )
}
