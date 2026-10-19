import Image from "next/image"
import Link from "next/link"
import { CalendarDays, Check, MessageSquareText, Music2 } from "lucide-react"
import { AuroraBackground } from "@/components/ui/aurora-background"

type AuthLayoutProps = {
  children: React.ReactNode
}

const workspaceFeatures = [
  {
    icon: Music2,
    title: "Songs, lyrics, and chords",
    description: "Keep every arrangement ready for your team.",
  },
  {
    icon: CalendarDays,
    title: "Services and schedules",
    description: "Know what is coming up and who is serving.",
  },
  {
    icon: MessageSquareText,
    title: "Team communication",
    description: "Keep updates and preparation in one place.",
  },
]

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuroraBackground className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-8">
      <main
        id="main-content"
        className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-[1240px] flex-col justify-center sm:min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4rem)]"
      >
        <div className="grid w-full items-stretch lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-white/50 lg:bg-white/30 lg:shadow-[0_32px_100px_-42px_rgba(15,23,42,0.36)] lg:backdrop-blur-xl">
          <aside className="relative hidden min-h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#173d2a] via-[#28523a] to-[#426949] p-10 text-white lg:flex xl:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-20 size-80 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-4 size-48 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-36 -left-24 size-96 rounded-full bg-white/[0.06] blur-3xl"
            />

            <div className="relative z-10">
              <Link
                href="/"
                aria-label="WorshipFlow home"
                className="inline-flex rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#28523a]"
              >
                <Image
                  src="/worshipflow-wordmark.png"
                  alt="WorshipFlow"
                  width={545}
                  height={100}
                  priority
                  className="h-auto w-56 brightness-0 invert"
                />
              </Link>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/65">
                Your worship team, in sync
              </p>

              <div className="mt-16 max-w-md xl:mt-20">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100/75">
                  Prepare with purpose
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight xl:text-[3.25rem]">
                  Make room for what matters.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-7 text-white/75 xl:text-base">
                  Bring your songs, services, schedules, and people together in
                  one calm, organized workspace.
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-12 space-y-5">
              {workspaceFeatures.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-emerald-100">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/65">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 border-t border-white/15 pt-6 text-xs text-white/60">
                <Check aria-hidden="true" className="size-4 text-emerald-100" />
                A shared home for your worship team
              </div>
            </div>
          </aside>

          <section className="flex w-full flex-col justify-center rounded-[28px] border border-white/50 bg-white/55 px-4 py-7 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:px-8 sm:py-9 lg:min-w-0 lg:rounded-none lg:border-0 lg:bg-white/55 lg:px-10 lg:py-12 lg:shadow-none xl:px-14">
            <div className="mx-auto w-full max-w-[500px]">
              <header className="mb-7 flex flex-col items-center text-center lg:hidden">
                <Link
                  href="/"
                  aria-label="WorshipFlow home"
                  className="inline-flex rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-4"
                >
                  <Image
                    src="/worshipflow-wordmark.png"
                    alt="WorshipFlow"
                    width={545}
                    height={100}
                    priority
                    className="h-auto w-52 sm:w-56"
                  />
                </Link>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
                  Your worship team, in sync
                </p>
              </header>

              {children}

              <footer className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--muted)] lg:mt-8">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-[var(--brand)]/65"
                />
                A shared home for your worship team
              </footer>
            </div>
          </section>
        </div>
      </main>
    </AuroraBackground>
  )
}
