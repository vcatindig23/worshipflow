import Image from "next/image"
import Link from "next/link"
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  Headphones,
  Music2,
  UsersRound,
  Volume2,
} from "lucide-react"

type AuthSplitLayoutProps = {
  children: React.ReactNode
}

export default function AuthSplitLayout({
  children,
}: AuthSplitLayoutProps) {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="order-2 flex min-w-0 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:order-1 lg:px-10 lg:py-12 xl:px-16">
          <div className="w-full max-w-[440px]">
            <Link
              href="/"
              aria-label="WorshipFlow home"
              className="mb-8 inline-flex rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-4"
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
            {children}
            <div className="mt-7 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--muted)]">
              <span className="size-1.5 rounded-full bg-[var(--brand)]/65" />
              A shared home for your worship team
            </div>
          </div>
        </section>

        <aside className="relative isolate order-1 flex min-h-[250px] flex-col overflow-hidden bg-[#152b20] px-6 py-5 text-white sm:min-h-[278px] sm:px-9 sm:py-7 lg:sticky lg:top-0 lg:order-2 lg:h-screen lg:min-h-[700px] lg:px-10 lg:py-9 xl:px-14 xl:py-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute -right-20 -top-28 size-[26rem] rounded-full border border-white/[0.09]" />
            <div className="absolute -right-2 -top-16 size-[21rem] rounded-full border border-white/[0.08]" />
            <div className="absolute -bottom-44 -left-28 size-[29rem] rounded-full border border-white/[0.07]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(143,184,151,0.24),transparent_47%),linear-gradient(145deg,#152b20_0%,#244a35_53%,#365c45_100%)]" />
            <svg
              viewBox="0 0 680 300"
              preserveAspectRatio="none"
              className="absolute inset-x-0 bottom-0 h-36 w-full opacity-30 lg:h-52"
              fill="none"
            >
              <path d="M0 226C82 186 113 256 188 216S303 155 370 196 488 263 562 205 625 181 680 201" stroke="white" strokeWidth="1.2" />
              <path d="M0 247C82 207 113 277 188 237S303 176 370 217 488 284 562 226 625 202 680 222" stroke="white" strokeWidth="1.2" />
              <path d="M0 268C82 228 113 298 188 258S303 197 370 238 488 305 562 247 625 223 680 243" stroke="white" strokeWidth="1.2" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-[#102318]/35 via-transparent to-white/[0.02]" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                <Image
                  src="/worshipflow-mark.png"
                  alt=""
                  aria-hidden="true"
                  width={340}
                  height={320}
                  className="size-7 object-contain"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight">WorshipFlow</span>
                <span className="mt-0.5 block text-[10px] text-white/60">Plan with purpose</span>
              </span>
            </div>
            <span className="hidden rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-medium text-white/70 sm:inline-flex">
              Made for ministry
            </span>
          </div>

          <div className="relative z-10 mt-5 flex-1 lg:mt-10 lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-lg">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#b8d8bf] sm:text-[10px]">
                Together in every service
              </p>
              <h2 className="mt-2 max-w-lg text-[1.35rem] font-semibold leading-tight tracking-[-0.04em] sm:mt-3 sm:text-3xl lg:text-4xl xl:text-[3.25rem]">
                Less scrambling.
                <span className="block text-white/70">More room to worship.</span>
              </h2>
              <p className="mt-2 hidden max-w-md text-sm leading-6 text-white/70 lg:mt-4 lg:block">
                Keep songs, service plans, schedules, and your team in sync—so you can focus on serving together.
              </p>
            </div>

            <div className="relative mt-8 hidden max-w-[500px] lg:block">
              <div className="absolute -inset-4 rounded-[2rem] bg-[#b8d8bf]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#f7faf7] p-5 text-[#17201b] shadow-[0_28px_90px_-32px_rgba(0,0,0,0.7)] xl:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-[#dfe7df] pb-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#64756a]">
                      <CalendarDays className="size-3.5" />
                      Sunday gathering
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight xl:text-xl">Service plan</h3>
                    <p className="mt-1 text-xs text-[#718076]">Sunday · 9:00 AM · Main sanctuary</p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d2e7d7] bg-[#e8f3e9] px-2.5 py-1.5 text-[10px] font-semibold text-[#315b3d]">
                    <CheckCircle2 className="size-3.5" />
                    Ready
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-[#e4eae4] bg-white px-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0e9] text-[#365c45]">
                      <Music2 className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">Opening worship</span>
                      <span className="mt-1 block text-[10px] text-[#768278]">Set 01 · Key G · 4:12</span>
                    </span>
                    <Check className="size-4 shrink-0 text-[#4e805a]" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[#e4eae4] bg-white px-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0e9] text-[#365c45]">
                      <Headphones className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">Rehearsal notes</span>
                      <span className="mt-1 block text-[10px] text-[#768278]">Charts and audio in one place</span>
                    </span>
                    <Check className="size-4 shrink-0 text-[#4e805a]" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[#e4eae4] bg-white px-3 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f0e9] text-[#365c45]">
                      <UsersRound className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold">Team confirmed</span>
                      <span className="mt-1 block text-[10px] text-[#768278]">Everyone knows where to be</span>
                    </span>
                    <Activity className="size-4 shrink-0 text-[#4e805a]" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#dfe7df] pt-4">
                  <div className="flex -space-x-2">
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#f7faf7] bg-[#365c45] text-[9px] font-semibold text-white">W</span>
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#f7faf7] bg-[#89a992] text-[9px] font-semibold text-white">M</span>
                    <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#f7faf7] bg-[#bdcfc0] text-[9px] font-semibold text-[#294735]">T</span>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-[#48644f]">
                    <Volume2 className="size-3.5" />
                    Ready for rehearsal
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto hidden items-center justify-between border-t border-white/15 pt-5 text-[10px] text-white/55 lg:flex">
            <span>Prepared together. Served with purpose.</span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#b8d8bf]" />
              Your team, in sync
            </span>
          </div>
        </aside>
      </div>
    </main>
  )
}
