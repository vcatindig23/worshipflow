import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  ListMusic,
  Plus,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTeamPositionLabel } from "@/lib/team-positions"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type ServicesPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Setlist = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  status: "draft" | "published" | "archived"
}

type SetlistSong = {
  setlist_id: string
}

type TeamAssignment = {
  setlist_id: string
  user_id: string
  team_position: string
}

type MemberProfile = {
  id: string
  display_name: string | null
}

type Period = "upcoming" | "past" | "all"

function getParam(
  value: string | string[] | undefined
) {
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

function statusLabel(status: Setlist["status"]) {
  if (status === "published") {
    return "Published"
  }

  if (status === "archived") {
    return "Archived"
  }

  return "Draft"
}

const periods: { value: Period; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All services" },
]

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
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

  let setlistQuery = supabase
    .from("setlists")
    .select("id, name, description, service_date, status")
    .eq("organization_id", workspace.organizationId)
    .order("service_date", {
      ascending: period !== "past",
      nullsFirst: false,
    })

  if (period === "upcoming") {
    setlistQuery = setlistQuery
      .gte("service_date", today)
      .neq("status", "archived")
  } else if (period === "past") {
    setlistQuery = setlistQuery
      .not("service_date", "is", null)
      .lt("service_date", today)
  }

  const { data, error } = await setlistQuery

  if (error) {
    redirect("/error?code=setlists_load_failed")
  }

  const setlists = (data ?? []) as Setlist[]
  const songCounts = new Map<string, number>()
  const assignmentsBySetlist = new Map<string, TeamAssignment[]>()

  if (setlists.length > 0) {
    const setlistIds = setlists.map((setlist) => setlist.id)
    const [songsResult, assignmentsResult] = await Promise.all([
      supabase
        .from("setlist_songs")
        .select("setlist_id")
        .in("setlist_id", setlistIds),
      supabase
        .from("setlist_team_assignments")
        .select("setlist_id, user_id, team_position")
        .in("setlist_id", setlistIds)
        .order("created_at", { ascending: true }),
    ])

    if (songsResult.error || assignmentsResult.error) {
      redirect("/error?code=setlists_load_failed")
    }

    for (const row of (songsResult.data ?? []) as SetlistSong[]) {
      songCounts.set(
        row.setlist_id,
        (songCounts.get(row.setlist_id) ?? 0) + 1
      )
    }

    for (const assignment of (assignmentsResult.data ?? []) as TeamAssignment[]) {
      const assignments = assignmentsBySetlist.get(assignment.setlist_id) ?? []
      assignments.push(assignment)
      assignmentsBySetlist.set(assignment.setlist_id, assignments)
    }
  }

  const assignedUserIds = Array.from(
    new Set(
      Array.from(assignmentsBySetlist.values()).flatMap((assignments) =>
        assignments.map((assignment) => assignment.user_id)
      )
    )
  )
  let profileNames = new Map<string, string>()

  if (assignedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", assignedUserIds)

    if (profilesError) {
      redirect("/error?code=setlists_load_failed")
    }

    profileNames = new Map(
      ((profiles ?? []) as MemberProfile[]).map((profile) => [
        profile.id,
        profile.display_name?.trim() || "Name not set",
      ])
    )
  }

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            <CalendarDays className="size-3.5" />
            Service Planning
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
            Services
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            See what&apos;s coming up and open a service plan to review its
            worship order.
          </p>
        </div>

        <Link
          href="/setlists/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
        >
          <Plus className="size-4" />
          Plan a Service
        </Link>
      </section>

      <nav
        aria-label="Service schedule"
        className="flex flex-wrap gap-2"
      >
        {periods.map((item) => (
          <Link
            key={item.value}
            href={
              item.value === "upcoming"
                ? "/services"
                : `/services?period=${item.value}`
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {setlists.length}{" "}
              {setlists.length === 1 ? "service" : "services"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {period === "upcoming"
                ? `Scheduled for today or later (${workspace.organizationTimezone})`
                : period === "past"
                  ? "Previously scheduled services"
                  : "All service plans with or without a date"}
            </p>
          </div>

          <Link
            href="/setlists"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            All setlists
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {setlists.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <CalendarDays className="size-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              {period === "upcoming"
                ? "No upcoming services"
                : period === "past"
                  ? "No past services"
                  : "No service plans yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {period === "upcoming"
                ? "Create a setlist and give it a service date to add it to the schedule."
                : period === "past"
                  ? "Services with dates before today will appear here."
                  : "Create your first service plan to start building a worship order."}
            </p>

            <Link
              href="/setlists/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <Plus className="size-4" />
              Plan a Service
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {setlists.map((setlist) => (
              <Link
                key={setlist.id}
                href={`/setlists/${setlist.id}`}
                className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <ListMusic className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                          {setlist.name}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            setlist.status === "published"
                              ? "bg-emerald-100 text-emerald-800"
                              : setlist.status === "archived"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-[var(--surface)] text-[var(--muted)]"
                          }`}
                        >
                          {statusLabel(setlist.status)}
                        </span>
                      </div>

                      {setlist.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                          {setlist.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" />
                          {formatDate(setlist.service_date)}
                        </span>
                        <span>
                          {songCounts.get(setlist.id) ?? 0}{" "}
                          {(songCounts.get(setlist.id) ?? 0) === 1
                            ? "song"
                            : "songs"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(assignmentsBySetlist.get(setlist.id) ?? []).length > 0 ? (
                          (assignmentsBySetlist.get(setlist.id) ?? []).map(
                            (assignment) => (
                              <span
                                key={`${assignment.user_id}-${assignment.team_position}`}
                                className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--foreground)]"
                              >
                                {profileNames.get(assignment.user_id) ?? "Name not set"}
                                {" · "}
                                {getTeamPositionLabel(assignment.team_position)}
                              </span>
                            )
                          )
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            Team not assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="hidden size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)] md:block" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
