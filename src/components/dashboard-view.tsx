import Link from "next/link"
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  House,
  ListMusic,
  LogOut,
  Menu,
  Music2,
  Plus,
  Search,
  Settings,
  Users,
  UserRound,
} from "lucide-react"
import { getTeamPositionLabel } from "@/lib/team-positions"
import type { WorkspaceData } from "@/lib/workspace/get-workspace"

type DashboardViewProps = {
  workspace: WorkspaceData
  onMenuOpen?: () => void
}

const navigation = [
  {
    label: "Dashboard",
    href: "/",
    icon: House,
  },
  {
    label: "Songs",
    href: "/songs",
    icon: Music2,
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
    label: "My Schedule",
    href: "/my-schedule",
    icon: UserRound,
  },
  {
    label: "Team",
    href: "/settings/team",
    icon: Users,
  },
  {
    label: "Files",
    href: "/files",
    icon: FileText,
  },
]

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatServiceTime(time: string | null) {
  if (!time) {
    return null
  }

  const [hoursString, minutesString] = time.split(":")
  const hours = Number(hoursString)
  const minutes = minutesString ?? "00"

  if (Number.isNaN(hours)) {
    return time
  }

  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}

function formatDay(day: number) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]

  return days[day] ?? "Sunday"
}

export default function DashboardView({
  workspace,
  onMenuOpen,
}: DashboardViewProps) {
  const userInitials = workspace.userName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[264px] shrink-0 flex-col bg-[var(--sidebar)] text-white lg:flex">
          <div className="flex h-[78px] items-center gap-3 border-b border-white/8 px-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--sidebar)]">
              <Music2 className="size-5" />
            </div>

            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-[-0.02em]">
                WorshipFlow
              </div>

              <div className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">
                Worship workspace
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
              Workspace
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      item.href === "/"
                        ? "bg-[var(--brand)] text-white"
                        : "text-[var(--sidebar-muted)] hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
              Manage
            </div>

            <nav>
              <Link
                href="/settings"
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white"
              >
                <Settings className="size-[18px]" strokeWidth={1.8} />
                <span>Settings</span>
              </Link>
            </nav>
          </div>

          <div className="border-t border-white/8 p-3">
            <div className="rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                  {userInitials}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {workspace.userName}
                  </div>

                  <div className="truncate text-xs text-[var(--sidebar-muted)]">
                    {roleLabel(workspace.role)}
                  </div>
                </div>

                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className="rounded-lg p-1.5 text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white"
                  >
                    <LogOut className="size-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-[78px] items-center border-b border-[var(--border)] bg-white/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={onMenuOpen}
                aria-label="Open navigation"
                className="rounded-xl border border-[var(--border)] p-2.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] lg:hidden"
              >
                <Menu className="size-5" />
              </button>

              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-[var(--muted)]">
                  {workspace.organizationName}
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
              </button>

              <Link
                href="/songs/new"
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
                <p className="text-sm font-medium text-[var(--brand)]">
                  Welcome back, {workspace.userName}
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {workspace.organizationName}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Your worship workspace is ready. Manage songs, prepare
                  worship services, and keep your team organized.
                </p>
              </section>

              {!workspace.serviceTimeAvailable ? (
                <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Service start times are temporarily unavailable. Apply
                  {" "}
                  <code className="font-semibold">
                    20261007100419_add_setlist_service_time.sql
                  </code>
                  {" "}
                  to the Supabase database to enable them.
                </div>
              ) : null}

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
                  <div className="text-xs font-medium text-[var(--muted)]">
                    Songs
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {workspace.songCount}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Active songs in your library
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
                  <div className="text-xs font-medium text-[var(--muted)]">
                    Team members
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {workspace.memberCount}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Members in this workspace
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
                  <div className="text-xs font-medium text-[var(--muted)]">
                    Default service
                  </div>
                  <div className="mt-2 truncate text-lg font-semibold tracking-[-0.03em]">
                    {workspace.defaultServiceName}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {formatDay(workspace.defaultServiceDay)} at{" "}
                    {formatServiceTime(workspace.defaultServiceTime)}
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
                  <div className="text-xs font-medium text-[var(--muted)]">
                    Your role
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">
                    {roleLabel(workspace.role)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Workspace access level
                  </div>
                </div>
              </section>

              <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div>
                    <h3 className="text-base font-semibold">
                      Upcoming services
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Your next dated worship plans
                    </p>
                  </div>

                  <Link
                    href="/services"
                    className="text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    View schedule
                  </Link>
                </div>

                {workspace.upcomingSetlists.length === 0 ? (
                  <div className="flex flex-col items-start gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <p className="text-sm font-medium">
                        No upcoming services scheduled
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Create a dated setlist to add a service to your schedule.
                      </p>
                    </div>

                    <Link
                      href="/setlists/new"
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      <Plus className="size-3.5" />
                      Plan a service
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-3">
                    {workspace.upcomingSetlists.map((setlist) => (
                      <Link
                        key={setlist.id}
                        href={`/setlists/${setlist.id}`}
                        className="flex items-start gap-3 bg-white px-5 py-4 transition hover:bg-[var(--surface)] sm:px-6"
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          <CalendarDays className="size-[18px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {setlist.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {new Intl.DateTimeFormat("en-PH", {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }).format(
                              new Date(`${setlist.service_date}T00:00:00Z`)
                            )}
                            {formatServiceTime(setlist.service_time)
                              ? ` · ${formatServiceTime(setlist.service_time)}`
                              : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {setlist.teamAssignments.length > 0 ? (
                              setlist.teamAssignments.map((assignment) => (
                                <span
                                  key={`${assignment.userId}-${assignment.position}`}
                                  className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] text-[var(--foreground)]"
                                >
                                  {assignment.displayName}
                                  {" · "}
                                  {getTeamPositionLabel(assignment.position)}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[var(--muted)]">
                                Team not assigned
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div>
                    <h3 className="text-base font-semibold">
                      Your upcoming assignments
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Services where you are scheduled to serve
                    </p>
                  </div>
                  <Link
                    href="/my-schedule"
                    className="text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    My schedule
                  </Link>
                </div>

                {workspace.myUpcomingAssignments.length === 0 ? (
                  <p className="px-5 py-5 text-sm text-[var(--muted)] sm:px-6">
                    You don&apos;t have any upcoming service assignments.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {workspace.myUpcomingAssignments.map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/setlists/${assignment.id}`}
                        className="flex flex-col gap-2 px-5 py-4 transition hover:bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {assignment.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {new Intl.DateTimeFormat("en-PH", {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }).format(
                              new Date(`${assignment.service_date}T00:00:00Z`)
                            )}
                            {formatServiceTime(assignment.service_time)
                              ? ` · ${formatServiceTime(assignment.service_time)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {assignment.positions.map((position) => (
                            <span
                              key={position}
                              className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--brand)]"
                            >
                              {getTeamPositionLabel(position)}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
                <div className="rounded-2xl border border-[var(--border)] bg-white">
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
                    <div>
                      <h3 className="text-base font-semibold">
                        Recent songs
                      </h3>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Recently created or updated charts
                      </p>
                    </div>

                    <Link
                      href="/songs"
                      className="text-xs font-semibold text-[var(--brand)] hover:underline"
                    >
                      View all
                    </Link>
                  </div>

                  {workspace.recentSongs.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Music2 className="size-5" />
                      </div>

                      <h4 className="mt-4 text-sm font-semibold">
                        Your song library is empty
                      </h4>

                      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">
                        Create your first song chart with chords and lyrics.
                      </p>

                      <Link
                        href="/songs/new"
                        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
                      >
                        <Plus className="size-4" />
                        Create song
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {workspace.recentSongs.map((song) => (
                        <Link
                          href={`/songs/${song.id}`}
                          key={song.id}
                          className="flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--surface)] sm:px-6"
                        >
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--brand)]">
                            <Music2 className="size-[18px]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {song.title}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                              {song.artist || "Unknown artist"}
                            </div>
                          </div>

                          <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                            {song.current_key || "—"}
                          </span>

                          <ChevronRight className="size-4 text-[var(--muted)]" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <h3 className="text-base font-semibold">
                      Church workspace
                    </h3>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Information from your onboarding setup
                    </p>
                  </div>

                  <div className="space-y-5 p-5">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                        Church
                      </div>

                      <div className="mt-1 text-sm font-semibold">
                        {workspace.organizationName}
                      </div>
                    </div>

                    {workspace.organizationDescription ? (
                      <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                          Description
                        </div>

                        <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          {workspace.organizationDescription}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                        Default service
                      </div>

                      <div className="mt-1 text-sm font-semibold">
                        {workspace.defaultServiceName}
                      </div>

                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {formatDay(workspace.defaultServiceDay)} at{" "}
                        {formatServiceTime(workspace.defaultServiceTime)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                        Time zone
                      </div>

                      <div className="mt-1 text-sm font-medium">
                        {workspace.organizationTimezone}
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white text-sm font-semibold transition hover:bg-[var(--surface)]"
                    >
                      <Settings className="size-4" />
                      Manage church settings
                    </Link>
                  </div>
                </div>
              </section>

              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <Link
                  href="/songs/new"
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
                    <ChevronRight className="size-3.5" />
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
                    Arrange your worship songs and prepare the service flow.
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    Open setlists
                    <ChevronRight className="size-3.5" />
                  </div>
                </Link>

                <Link
                  href="/settings"
                  className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Settings className="size-5" />
                  </div>

                  <div className="mt-4 text-sm font-semibold">
                    Update church details
                  </div>

                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Keep your workspace information and service defaults
                    current.
                  </p>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                    Open settings
                    <ChevronRight className="size-3.5" />
                  </div>
                </Link>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}