"use client"

import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  FileText,
  Guitar,
  House,
  Library,
  ListMusic,
  Menu,
  Music2,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

type NavigationItem = {
  label: string
  href: string
  icon: typeof House
  badge?: string
}

const primaryNavigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: House,
  },
  {
    label: "Songs",
    href: "/songs",
    icon: Music2,
    badge: "124",
  },
  {
    label: "Setlists",
    href: "/setlists",
    icon: ListMusic,
  },
  {
    label: "Services",
    href: "/services",
    icon: CalendarDays,
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
  },
  {
    label: "Files",
    href: "/files",
    icon: FileText,
  },
]

const secondaryNavigation: NavigationItem[] = [
  {
    label: "Song Library",
    href: "/library",
    icon: Library,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

const recentSongs = [
  {
    title: "Goodness of God",
    artist: "Jenn Johnson",
    key: "G",
    tempo: 68,
    updated: "Today",
  },
  {
    title: "This Is Amazing Grace",
    artist: "Phil Wickham",
    key: "E",
    tempo: 118,
    updated: "Yesterday",
  },
  {
    title: "How Great Thou Art",
    artist: "Traditional",
    key: "G",
    tempo: 72,
    updated: "2 days ago",
  },
  {
    title: "Build My Life",
    artist: "Housefires",
    key: "E",
    tempo: 84,
    updated: "3 days ago",
  },
]

const serviceSongs = [
  {
    number: "01",
    title: "This Is Amazing Grace",
    key: "E",
  },
  {
    number: "02",
    title: "Goodness of God",
    key: "G",
  },
  {
    number: "03",
    title: "Build My Life",
    key: "E",
  },
]

const teamMembers = [
  {
    initials: "VL",
    name: "Worship Leader",
    role: "Lead Vocals",
  },
  {
    initials: "AG",
    name: "Acoustic Guitar",
    role: "Instrumentalist",
  },
  {
    initials: "EG",
    name: "Electric Guitar",
    role: "Instrumentalist",
  },
  {
    initials: "KB",
    name: "Keyboard",
    role: "Instrumentalist",
  },
]

function NavigationLink({
  item,
  onNavigate,
}: {
  item: NavigationItem
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const isActive = item.href === "/"

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
        isActive
          ? "bg-[var(--brand)] text-white shadow-sm"
          : "text-[var(--sidebar-muted)] hover:bg-white/8 hover:text-white"
      }`}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            isActive
              ? "bg-white/15 text-white"
              : "bg-white/8 text-[var(--sidebar-muted)]"
          }`}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

function Sidebar({
  mobile = false,
  onClose,
}: {
  mobile?: boolean
  onClose?: () => void
}) {
  return (
    <aside
      className={`flex h-full w-[264px] flex-col bg-[var(--sidebar)] text-white ${
        mobile ? "shadow-2xl" : ""
      }`}
    >
      <div className="flex h-[78px] items-center justify-between border-b border-white/8 px-5">
        <Link href="/" className="flex items-center gap-3" onClick={onClose}>
          <div className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--sidebar)]">
            <Music2 className="size-5" strokeWidth={2} />
          </div>

          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em]">
              WorshipFlow
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">
              Worship workspace
            </div>
          </div>
        </Link>

        {mobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
          Workspace
        </div>

        <nav className="space-y-1">
          {primaryNavigation.map((item) => (
            <NavigationLink key={item.href} item={item} onNavigate={onClose} />
          ))}
        </nav>

        <div className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
          Manage
        </div>

        <nav className="space-y-1">
          {secondaryNavigation.map((item) => (
            <NavigationLink key={item.href} item={item} onNavigate={onClose} />
          ))}
        </nav>
      </div>

      <div className="border-t border-white/8 p-3">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
              VF
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">Worship Team</div>
              <div className="truncate text-xs text-[var(--sidebar-muted)]">
                Administrator
              </div>
            </div>

            <button
              type="button"
              aria-label="Open account menu"
              className="rounded-lg p-1.5 text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white"
            >
              <CircleUserRound className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="text-xs font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--muted)]">{detail}</div>
    </div>
  )
}

export default function WorshipFlowShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation overlay"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <div className="relative h-full">
              <Sidebar mobile onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[78px] items-center border-b border-[var(--border)] bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="rounded-xl border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] lg:hidden"
              >
                <Menu className="size-5" />
              </button>

              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-[var(--muted)]">
                  Sunday Service
                </div>
                <h1 className="truncate text-lg font-semibold tracking-[-0.025em]">
                  Dashboard
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                aria-label="Search"
                className="rounded-xl border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <Search className="size-[18px]" />
              </button>

              <button
                type="button"
                aria-label="Notifications"
                className="relative rounded-xl border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <Bell className="size-[18px]" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[var(--brand)]" />
              </button>

              <Link
                href="/songs"
                className="ml-2 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
              >
                <Plus className="size-4" />
                New Song
              </Link>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto max-w-[1480px]">
              <section className="mb-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--brand)]">
                      Good evening
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                      Ready for Sunday?
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                      Prepare your songs, setlists, and team assignments from
                      one place.
                    </p>
                  </div>

                  <Link
                    href="/setlists"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                  >
                    View setlist
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Songs"
                  value="124"
                  detail="4 updated this week"
                />
                <StatCard
                  label="Setlists"
                  value="12"
                  detail="3 upcoming services"
                />
                <StatCard
                  label="Team"
                  value="18"
                  detail="15 active members"
                />
                <StatCard
                  label="This month"
                  value="8"
                  detail="Services scheduled"
                />
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
                <div className="rounded-2xl border border-[var(--border)] bg-white">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        Upcoming service
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Sunday, October 4, 2026
                      </p>
                    </div>

                    <Link
                      href="/services"
                      className="text-xs font-semibold text-[var(--brand)] hover:underline"
                    >
                      Manage service
                    </Link>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="rounded-2xl bg-[var(--surface)] p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                            Sunday Worship
                          </div>
                          <div className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                            9:00 AM
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--muted)]">
                          <CalendarDays className="size-4" />
                          3 days away
                        </div>
                      </div>

                      <div className="mt-5 grid gap-2">
                        {serviceSongs.map((song) => (
                          <Link
                            href="/songs"
                            key={song.number}
                            className="group flex items-center gap-3 rounded-xl border border-transparent bg-white px-3.5 py-3 transition hover:border-[var(--border)] hover:shadow-sm"
                          >
                            <span className="w-7 text-xs font-semibold text-[var(--muted)]">
                              {song.number}
                            </span>

                            <Music2 className="size-4 text-[var(--brand)]" />

                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {song.title}
                            </span>

                            <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                              {song.key}
                            </span>

                            <ChevronRight className="size-4 text-[var(--muted)] transition group-hover:translate-x-0.5" />
                          </Link>
                        ))}
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                          <div className="text-[11px] text-[var(--muted)]">
                            Songs
                          </div>
                          <div className="mt-1 text-lg font-semibold">3</div>
                        </div>

                        <div className="rounded-xl border border-[var(--border)] bg-white p-3">
                          <div className="text-[11px] text-[var(--muted)]">
                            Team
                          </div>
                          <div className="mt-1 text-lg font-semibold">4</div>
                        </div>

                        <div className="col-span-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:col-span-1">
                          <div className="text-[11px] text-[var(--muted)]">
                            Status
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                            <span className="size-2 rounded-full bg-[var(--brand)]" />
                            Prepared
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                    <div>
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        Worship team
                      </h3>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Assigned for Sunday
                      </p>
                    </div>

                    <Link
                      href="/team"
                      className="text-xs font-semibold text-[var(--brand)] hover:underline"
                    >
                      View team
                    </Link>
                  </div>

                  <div className="divide-y divide-[var(--border)]">
                    {teamMembers.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 px-5 py-4"
                      >
                        <div className="flex size-9 items-center justify-center rounded-full bg-[var(--surface)] text-[11px] font-semibold text-[var(--brand-dark)]">
                          {member.initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {member.name}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--muted)]">
                            {member.role}
                          </div>
                        </div>

                        <span className="size-2 rounded-full bg-[var(--brand)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white">
                <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.02em]">
                      Recent songs
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Recently created or updated song charts
                    </p>
                  </div>

                  <Link
                    href="/songs"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    Open song library
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        <th className="px-5 py-3 sm:px-6">Song</th>
                        <th className="px-4 py-3">Key</th>
                        <th className="px-4 py-3">BPM</th>
                        <th className="px-4 py-3">Updated</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {recentSongs.map((song) => (
                        <tr
                          key={song.title}
                          className="border-b border-[var(--border)] last:border-b-0"
                        >
                          <td className="px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--brand)]">
                                <Guitar
                                  className="size-[17px]"
                                  strokeWidth={1.8}
                                />
                              </div>

                              <div>
                                <div className="text-sm font-medium">
                                  {song.title}
                                </div>
                                <div className="mt-0.5 text-xs text-[var(--muted)]">
                                  {song.artist}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                              {song.key}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-[var(--muted)]">
                            {song.tempo}
                          </td>

                          <td className="px-4 py-4 text-sm text-[var(--muted)]">
                            {song.updated}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <Link
                              href="/songs"
                              className="text-xs font-semibold text-[var(--brand)] hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <Link
                  href="/songs"
                  className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Plus className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">
                    Create a song
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Add lyrics, chords, key, tempo, and song details.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    Get started
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>

                <Link
                  href="/setlists"
                  className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <ListMusic className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">
                    Build a setlist
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Arrange songs and prepare your worship flow.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    Create setlist
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>

                <Link
                  href="/services"
                  className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <CalendarDays className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold">
                    Prepare a service
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Assign musicians, songs, notes, and service details.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    Open services
                    <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </section>

              <footer className="py-8 text-center text-xs text-[var(--muted)]">
                WorshipFlow
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}