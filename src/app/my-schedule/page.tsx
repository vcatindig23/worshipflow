import Link from "next/link"
import {
  ArrowRight,
  CalendarPlus,
  CalendarDays,
  ListMusic,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  formatServiceTime,
  getCalendarDateRange,
} from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getTeamPositionLabel } from "@/lib/team-positions"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type MySchedulePageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Assignment = {
  setlist_id: string
  team_position: string
}

type Setlist = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
}

type Period = "upcoming" | "past" | "all"

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return `${part("year")}-${part("month")}-${part("day")}`
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not set"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00`))
}

function getGoogleCalendarUrl(
  setlist: Setlist,
  positions: string[],
  timeZone: string
) {
  if (!setlist.service_date) {
    return null
  }

  const details = [
    ...positions.map(
      (position) => `Assigned position: ${getTeamPositionLabel(position)}`
    ),
    ...(setlist.description ? [setlist.description] : []),
  ].join("\n")
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: setlist.name,
    dates: getCalendarDateRange(
      setlist.service_date,
      setlist.service_time
    ),
    details,
  })
  if (setlist.service_time) {
    parameters.set("ctz", timeZone)
  }

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`
}

const periods: { value: Period; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All services" },
]

export default async function MySchedulePage({
  searchParams,
}: MySchedulePageProps) {
  const [params, workspace] = await Promise.all([
    searchParams,
    getWorkspace(),
  ])
  const requestedPeriod = getParam(params.period)
  const period: Period =
    requestedPeriod === "past" || requestedPeriod === "all"
      ? requestedPeriod
      : "upcoming"
  const today = getToday(workspace.organizationTimezone)
  const supabase = await createClient()
  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const { data: assignments, error: assignmentsError } = await supabase
    .from("setlist_team_assignments")
    .select("setlist_id, team_position")
    .eq("user_id", workspace.userId)

  if (assignmentsError) {
    redirect("/error?code=setlists_load_failed")
  }

  const memberAssignments = (assignments ?? []) as Assignment[]
  const setlistIds = Array.from(
    new Set(memberAssignments.map((assignment) => assignment.setlist_id))
  )
  let setlists: Setlist[] = []

  if (setlistIds.length > 0) {
    let query = supabase
      .from("setlists")
      .select("*")
      .eq("organization_id", workspace.organizationId)
      .in("id", setlistIds)
      .order("service_date", {
        ascending: period !== "past",
        nullsFirst: false,
      })

    if (period === "upcoming") {
      query = query
        .gte("service_date", today)
        .neq("status", "archived")
    } else if (period === "past") {
      query = query
        .not("service_date", "is", null)
        .lt("service_date", today)
    }

    const { data, error } = await query
    if (error) {
      redirect("/error?code=setlists_load_failed")
    }

    setlists = (data ?? []).map((setlist) => ({
      ...setlist,
      service_time: serviceTimeAvailable
        ? setlist.service_time
        : null,
    })) as Setlist[]
  }

  const positionsBySetlist = new Map<string, string[]>()
  for (const assignment of memberAssignments) {
    const positions = positionsBySetlist.get(assignment.setlist_id) ?? []
    positions.push(assignment.team_position)
    positionsBySetlist.set(assignment.setlist_id, positions)
  }
  const calendarUrlsBySetlist = new Map(
    setlists.map((setlist) => [
      setlist.id,
      getGoogleCalendarUrl(
        setlist,
        positionsBySetlist.get(setlist.id) ?? [],
        workspace.organizationTimezone
      ),
    ])
  )

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              <CalendarDays className="size-3.5" />
              Your Worship Team Schedule
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
              My Schedule
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Review services where you have been assigned, including the
              positions you are scheduled to serve.
            </p>
          </div>
        </div>
      </section>

      <nav aria-label="My service schedule" className="flex flex-wrap gap-2">
        {periods.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "upcoming"
                ? "/my-schedule"
                : `/my-schedule?period=${item.value}`
            }
            aria-current={period === item.value ? "page" : undefined}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              period === item.value
                ? "bg-[var(--brand)] text-white"
                : "border border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section>
        <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          {setlists.length} {setlists.length === 1 ? "service" : "services"}
        </p>
        {setlists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <CalendarDays className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              {period === "upcoming"
                ? "No upcoming assignments"
                : period === "past"
                  ? "No past assignments"
                  : "No service assignments yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {period === "upcoming"
                ? "When a worship leader schedules you for a service, it will appear here."
                : period === "past"
                  ? "Your completed service assignments will appear here."
                  : "You are not currently assigned to any services."}
            </p>
            <Link
              href="/services"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              View service schedule
              <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {setlists.map((setlist) => (
              <div
                key={setlist.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-start"
              >
                <Link
                  href={`/setlists/${setlist.id}`}
                  className="group flex min-w-0 flex-1 items-start gap-4"
                >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <ListMusic className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                          {setlist.name}
                        </h2>
                        <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--muted)]">
                          {setlist.status === "published"
                            ? "Published"
                            : setlist.status === "archived"
                              ? "Archived"
                              : "Draft"}
                        </span>
                      </div>
                      {setlist.description ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {setlist.description}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        {formatDate(setlist.service_date)}
                        {formatServiceTime(setlist.service_time)
                          ? ` · ${formatServiceTime(setlist.service_time)}`
                          : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(positionsBySetlist.get(setlist.id) ?? []).map(
                          (position) => (
                            <span
                              key={position}
                              className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--brand)]"
                            >
                              {getTeamPositionLabel(position)}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
                </Link>
                {calendarUrlsBySetlist.get(setlist.id) ? (
                  <a
                    href={calendarUrlsBySetlist.get(setlist.id) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                  >
                    <CalendarPlus className="size-3.5" />
                    Add to Google Calendar
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
