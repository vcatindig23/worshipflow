import Image from "next/image"
import DrapeBackground from "@/components/kokonutui/drape-background"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Music2,
  UsersRound,
} from "lucide-react"

const highlights = [
  {
    icon: Music2,
    title: "Songs that stay ready",
    description: "Keep lyrics, chords, keys, and arrangements together.",
  },
  {
    icon: CalendarDays,
    title: "Services without the scramble",
    description: "Build setlists, plan rehearsals, and keep schedules clear.",
  },
  {
    icon: UsersRound,
    title: "One team, in sync",
    description: "Coordinate roles, confirmations, files, and conversations.",
  },
]

export default function LandingHero() {
  return (
    <main className="wf-landing-page relative isolate min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="wf-landing-mesh" aria-hidden="true" />

      <DrapeBackground
        className="wf-landing-drape block min-h-0 w-full bg-transparent dark:bg-transparent text-[var(--foreground)] dark:text-[var(--foreground)]"
        wind={0.4}
        pleat={28}
        interactive={true}
      >
        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7">
          <Link
            href="/"
            aria-label="WorshipFlow home"
            className="inline-flex shrink-0 rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-4"
          >
            <Image
              src="/worshipflow-wordmark.png"
              alt="WorshipFlow"
              width={545}
              height={100}
              priority
              className="wf-landing-wordmark h-auto w-40 sm:w-48"
            />
          </Link>
  
          <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)] sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] sm:px-4"
            >
              <span>Create account</span>
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </nav>
        </header>
  
        <section
          aria-labelledby="landing-hero-title"
          className="relative z-10 mx-auto flex min-h-[min(760px,calc(100svh-84px))] w-full max-w-6xl flex-col items-center justify-center px-5 pb-20 pt-14 text-center sm:px-8 sm:pb-24 sm:pt-16 lg:pt-20"
        >
          <div className="wf-landing-eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/75 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)] shadow-sm backdrop-blur-md sm:text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--brand)]/35 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--brand)]" />
            </span>
            Made for worship teams
          </div>
  
          <h1
            id="landing-hero-title"
            className="mt-7 max-w-5xl text-balance text-[clamp(2.65rem,7.2vw,5.75rem)] font-semibold leading-[1.03] tracking-[-0.065em] text-[var(--foreground)]"
          >
            Bring your worship team
            <span className="wf-landing-title-accent mt-1 block">
              into harmony.
            </span>
          </h1>
  
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-[var(--muted)] sm:mt-7 sm:text-lg sm:leading-8">
            Songs, chord charts, service plans, schedules, and team
            communication—together in one calm, organized workspace.
          </p>
  
          <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-12px_rgba(41,71,53,0.65)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-[0_18px_36px_-14px_rgba(41,71,53,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
            >
              Create your workspace
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 px-6 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/45 hover:bg-[var(--card)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
            >
              I already have an account
            </Link>
          </div>
  
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--muted)] sm:mt-10 sm:text-sm">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="size-4 text-[var(--brand)]" />
              Built for real team workflows
            </span>
            <span className="hidden size-1 rounded-full bg-[var(--border)] sm:inline-block" aria-hidden="true" />
            <span>From rehearsal to Sunday</span>
          </div>
  
          <a
            href="#features"
            className="wf-landing-scroll-cue mt-12 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] sm:mt-14"
          >
            Explore the workspace
            <span aria-hidden="true" className="wf-landing-scroll-arrow">
              ↓
            </span>
          </a>
        </section>
      </DrapeBackground>

      <section
        id="features"
        aria-labelledby="landing-features-title"
        className="relative z-10 mx-auto w-full max-w-7xl scroll-mt-8 px-5 pb-16 sm:px-8 sm:pb-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
            One shared workspace
          </p>
          <h2
            id="landing-features-title"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl"
          >
            Everything your team needs to prepare with confidence.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="wf-landing-feature-card rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-5 text-left shadow-[0_16px_48px_-32px_rgba(23,32,27,0.3)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)]/35 hover:shadow-lg sm:p-6"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--border)]/70 px-5 py-6 text-center text-xs text-[var(--muted)] sm:px-8">
        WorshipFlow · A shared home for your worship team
      </footer>
    </main>
  )
}
