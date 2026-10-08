import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Music2,
  TrendingUp,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type CompletedService = {
  id: string
  name: string
  service_date: string | null
  completed_at: string
  attendance_count: number | null
  actual_duration_minutes: number | null
}

type ServiceSong = {
  setlist_id: string
  song_id: string
}

type Song = {
  id: string
  title: string
  artist: string | null
}

type AttendancePoint = {
  id: string
  name: string
  serviceDate: string | null
  attendance: number
}

type MonthPoint = {
  key: string
  label: string
  count: number
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not set"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "Not recorded"
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  return `${hours}h${remainder ? ` ${remainder}m` : ""}`
}

function monthKey(value: string) {
  return value.slice(0, 7)
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number)

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1))
}

export default async function ServiceInsightsPage() {
  const workspace = await getWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: workspace.organizationTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: string) =>
    todayParts.find((item) => item.type === type)?.value ?? ""

  const today = `${part("year")}-${part("month")}-${part("day")}`

  const [
    completedResult,
    pastResult,
  ] = await Promise.all([
    supabase
      .from("setlists")
      .select(
        "id, name, service_date, completed_at, attendance_count, actual_duration_minutes"
      )
      .eq("organization_id", workspace.organizationId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(200),

    supabase
      .from("setlists")
      .select("id, completed_at")
      .eq("organization_id", workspace.organizationId)
      .not("service_date", "is", null)
      .lt("service_date", today),
  ])

  if (completedResult.error || pastResult.error) {
    redirect("/error?code=setlists_load_failed")
  }

  const completedServices =
    (completedResult.data ?? []) as CompletedService[]

  const pastServices = pastResult.data ?? []
  const completedPastCount = pastServices.filter(
    (service) => Boolean(service.completed_at)
  ).length

  const completionRate =
    pastServices.length > 0
      ? Math.round(
          (completedPastCount / pastServices.length) * 100
        )
      : null

  const attendanceValues = completedServices
    .map((service) => service.attendance_count)
    .filter((value): value is number => value !== null)

  const durationValues = completedServices
    .map((service) => service.actual_duration_minutes)
    .filter((value): value is number => value !== null)

  const averageAttendance =
    attendanceValues.length > 0
      ? Math.round(
          attendanceValues.reduce(
            (sum, value) => sum + value,
            0
          ) / attendanceValues.length
        )
      : null

  const highestAttendance =
    attendanceValues.length > 0
      ? Math.max(...attendanceValues)
      : null

  const averageDuration =
    durationValues.length > 0
      ? Math.round(
          durationValues.reduce(
            (sum, value) => sum + value,
            0
          ) / durationValues.length
        )
      : null

  let songUsage: {
    song: Song
    count: number
  }[] = []

  if (completedServices.length > 0) {
    const completedIds = completedServices.map(
      (service) => service.id
    )

    const {
      data: serviceSongs,
      error: serviceSongsError,
    } = await supabase
      .from("setlist_songs")
      .select("setlist_id, song_id")
      .in("setlist_id", completedIds)

    if (serviceSongsError) {
      redirect("/error?code=setlists_load_failed")
    }

    const rows =
      (serviceSongs ?? []) as ServiceSong[]

    const songIds = Array.from(
      new Set(rows.map((row) => row.song_id))
    )

    if (songIds.length > 0) {
      const {
        data: songs,
        error: songsError,
      } = await supabase
        .from("songs")
        .select("id, title, artist")
        .eq(
          "organization_id",
          workspace.organizationId
        )
        .in("id", songIds)

      if (songsError) {
        redirect("/error?code=setlists_load_failed")
      }

      const songsById = new Map(
        ((songs ?? []) as Song[]).map((song) => [
          song.id,
          song,
        ])
      )

      const usageBySongId = new Map<string, number>()

      for (const row of rows) {
        usageBySongId.set(
          row.song_id,
          (usageBySongId.get(row.song_id) ?? 0) + 1
        )
      }

      songUsage = Array.from(
        usageBySongId.entries()
      )
        .map(([songId, count]) => {
          const song = songsById.get(songId)
          return song ? { song, count } : null
        })
        .filter(
          (
            value
          ): value is {
            song: Song
            count: number
          } => value !== null
        )
        .sort((a, b) => {
          if (b.count !== a.count) {
            return b.count - a.count
          }

          return a.song.title.localeCompare(
            b.song.title
          )
        })
        .slice(0, 6)
    }
  }

  const attendanceTrend: AttendancePoint[] =
    completedServices
      .filter(
        (
          service
        ): service is CompletedService & {
          attendance_count: number
        } => service.attendance_count !== null
      )
      .slice(0, 6)
      .reverse()
      .map((service) => ({
        id: service.id,
        name: service.name,
        serviceDate: service.service_date,
        attendance: service.attendance_count,
      }))

  const recentMonthCounts = new Map<string, number>()

  for (const service of completedServices) {
    if (!service.service_date) {
      continue
    }

    const key = monthKey(service.service_date)
    recentMonthCounts.set(
      key,
      (recentMonthCounts.get(key) ?? 0) + 1
    )
  }

  const monthPoints: MonthPoint[] =
    Array.from(recentMonthCounts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, count]) => ({
        key,
        label: monthLabel(key),
        count,
      }))

  const maxAttendance = Math.max(
    ...attendanceTrend.map(
      (point) => point.attendance
    ),
    1
  )

  const maxMonthCount = Math.max(
    ...monthPoints.map((point) => point.count),
    1
  )

  let songCountTotal = 0

  if (completedServices.length > 0) {
    const completedIds = completedServices.map(
      (service) => service.id
    )

    const { count, error } = await supabase
      .from("setlist_songs")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in("setlist_id", completedIds)

    if (error) {
      redirect("/error?code=setlists_load_failed")
    }

    songCountTotal = count ?? 0
  }

  const averageSongs =
    completedServices.length > 0
      ? Math.round(
          (songCountTotal /
            completedServices.length) *
            10
        ) / 10
      : null

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/services/history"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Service History
          </Link>

          <div className="mt-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              <BarChart3 className="size-3.5" />
              Service Insights
            </span>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
              Worship Service Insights
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Use your completed services to understand attendance, service
              length, completion habits, and song usage.
            </p>
          </div>
        </div>

        <Link
          href="/services"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
        >
          Back to Services
        </Link>
      </section>

      {completedServices.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <BarChart3 className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            Insights will appear after your first completed service
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Mark a service complete and record attendance or service details
            to start building useful planning insights.
          </p>
          <Link
            href="/services"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            View Services
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--brand)]">
                <CheckCircle2 className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Completed
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                {completedServices.length}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Based on recorded service history
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--brand)]">
                <Users className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Avg. attendance
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                {averageAttendance === null
                  ? "—"
                  : averageAttendance.toLocaleString(
                      "en-PH"
                    )}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {attendanceValues.length} service
                {attendanceValues.length === 1
                  ? ""
                  : "s"} recorded
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--brand)]">
                <Clock3 className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Avg. duration
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                {averageDuration === null
                  ? "—"
                  : formatDuration(averageDuration)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                From recorded actual duration
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--brand)]">
                <TrendingUp className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Completion rate
                </p>
              </div>
              <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
                {completionRate === null
                  ? "—"
                  : `${completionRate}%`}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {completedPastCount} of {pastServices.length} past services
                completed
              </p>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[var(--brand)]" />
                  <h2 className="font-semibold text-[var(--foreground)]">
                    Attendance trend
                  </h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Latest completed services with recorded attendance.
                </p>
              </div>

              {attendanceTrend.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                  Attendance has not been recorded for enough completed services
                  yet.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {attendanceTrend.map((point) => (
                    <div key={point.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--foreground)]">
                            {point.name}
                          </p>
                          <p className="mt-0.5 text-[var(--muted)]">
                            {formatDate(point.serviceDate)}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-[var(--foreground)]">
                          {point.attendance.toLocaleString("en-PH")}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all"
                          style={{
                            width: `${Math.max(
                              6,
                              Math.round(
                                (point.attendance /
                                  maxAttendance) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {highestAttendance !== null ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Highest recorded attendance
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {highestAttendance.toLocaleString("en-PH")} people
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[var(--brand)]" />
                <h2 className="font-semibold text-[var(--foreground)]">
                  Completed by month
                </h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Completed services grouped by service date.
              </p>

              {monthPoints.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                  Completed services do not have service dates yet.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {monthPoints.map((point) => (
                    <div key={point.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
                        <span className="font-semibold text-[var(--foreground)]">
                          {point.label}
                        </span>
                        <span className="font-semibold text-[var(--foreground)]">
                          {point.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all"
                          style={{
                            width: `${Math.max(
                              6,
                              Math.round(
                                (point.count /
                                  maxMonthCount) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Music2 className="size-4 text-[var(--brand)]" />
                <h2 className="font-semibold text-[var(--foreground)]">
                  Setlist snapshot
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface)] px-4 py-3">
                  <span className="text-sm text-[var(--muted)]">
                    Average songs
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {averageSongs === null
                      ? "—"
                      : averageSongs}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface)] px-4 py-3">
                  <span className="text-sm text-[var(--muted)]">
                    Songs in recorded history
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {songCountTotal}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Music2 className="size-4 text-[var(--brand)]" />
                <h2 className="font-semibold text-[var(--foreground)]">
                  Most-used songs
                </h2>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Songs that appear most often in your completed services.
              </p>

              {songUsage.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
                  No setlist songs are available in the recorded service
                  history yet.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-[var(--border)]">
                  {songUsage.map((item, index) => (
                    <div
                      key={item.song.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-bold text-[var(--muted)]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                            {item.song.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                            {item.song.artist ?? "Artist not set"}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
                        {item.count} service
                        {item.count === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
            <div className="text-sm text-[var(--muted)]">
              Insights are calculated from your recorded service history and
              update automatically as services are completed.
            </div>
            <Link
              href="/services/history"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Review service history
            </Link>
          </div>
        </>
      )}
    </main>
  )
}
