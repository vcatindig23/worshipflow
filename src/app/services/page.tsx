import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  ListMusic,
  Plus,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import ProfileAvatar from "@/components/profile-avatar"
import { createClient } from "@/lib/supabase/server"
import { formatServiceTime } from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
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
  service_time: string | null
  status: "draft" | "published" | "archived"
  completed_at: string | null
}

type SetlistSong = {
  setlist_id: string
}

type TeamAssignment = {
  setlist_id: string
  user_id: string
  team_position: string
  confirmation_status:
    | "pending"
    | "confirmed"
    | "declined"
}

type MemberProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type Period = "upcoming" | "past" | "all"

type ReadinessStatus =
  | "ready"
  | "attention"
  | "incomplete"

type ServiceReadiness = {
  status: ReadinessStatus
  percentage: number
  confirmedAssignments: number
  pendingAssignments: number
  declinedAssignments: number
  totalAssignments: number
  hasSchedule: boolean
  hasSongs: boolean
  hasTeam: boolean
  hasUnconfirmedTeam: boolean
}

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

function getServiceReadiness(
  setlist: Setlist,
  songCount: number,
  assignments: TeamAssignment[]
): ServiceReadiness {
  const hasSchedule =
    Boolean(setlist.service_date) &&
    Boolean(setlist.service_time)

  const hasSongs = songCount > 0
  const hasTeam = assignments.length > 0

  const confirmedAssignments =
    assignments.filter(
      (assignment) =>
        assignment.confirmation_status === "confirmed"
    ).length

  const pendingAssignments =
    assignments.filter(
      (assignment) =>
        assignment.confirmation_status === "pending"
    ).length

  const declinedAssignments =
    assignments.filter(
      (assignment) =>
        assignment.confirmation_status === "declined"
    ).length

  const totalAssignments = assignments.length

  const hasUnconfirmedTeam =
    pendingAssignments > 0 ||
    declinedAssignments > 0

  /*
   * Readiness is calculated from four equally weighted areas:
   *
   * 1. Schedule
   * 2. Songs
   * 3. Team
   * 4. Team confirmations
   *
   * The confirmation check is considered complete when:
   * - there is no team assigned, or
   * - every assigned member has confirmed.
   *
   * A service without a team cannot be considered ready, so
   * the Team check itself remains incomplete in that case.
   */
  const checks = [
    hasSchedule,
    hasSongs,
    hasTeam,
    hasTeam &&
      totalAssignments > 0 &&
      confirmedAssignments === totalAssignments,
  ]

  const completedChecks =
    checks.filter(Boolean).length

  const percentage =
    Math.round(
      (completedChecks / checks.length) * 100
    )

  let status: ReadinessStatus

  if (percentage === 100) {
    status = "ready"
  } else if (percentage >= 50) {
    status = "attention"
  } else {
    status = "incomplete"
  }

  return {
    status,
    percentage,
    confirmedAssignments,
    pendingAssignments,
    declinedAssignments,
    totalAssignments,
    hasSchedule,
    hasSongs,
    hasTeam,
    hasUnconfirmedTeam,
  }
}

function getReadinessLabel(
  readiness: ServiceReadiness
) {
  if (readiness.status === "ready") {
    return "Ready"
  }

  if (readiness.status === "attention") {
    return "Needs attention"
  }

  return "Incomplete"
}

function getReadinessClasses(
  status: ReadinessStatus
) {
  if (status === "ready") {
    return {
      container:
        "border-emerald-200 bg-emerald-50",
      icon:
        "bg-emerald-100 text-emerald-700",
      text:
        "text-emerald-800",
      muted:
        "text-emerald-700",
      progress:
        "bg-emerald-500",
    }
  }

  if (status === "attention") {
    return {
      container:
        "border-amber-200 bg-amber-50",
      icon:
        "bg-amber-100 text-amber-700",
      text:
        "text-amber-800",
      muted:
        "text-amber-700",
      progress:
        "bg-amber-500",
    }
  }

  return {
    container:
      "border-rose-200 bg-rose-50",
    icon:
      "bg-rose-100 text-rose-700",
    text:
      "text-rose-800",
    muted:
      "text-rose-700",
    progress:
      "bg-rose-500",
  }
}

const periods: {
  value: Period
  label: string
}[] = [
  {
    value: "upcoming",
    label: "Upcoming",
  },
  {
    value: "past",
    label: "Past",
  },
  {
    value: "all",
    label: "All services",
  },
]

export default async function ServicesPage({
  searchParams,
}: ServicesPageProps) {
  const [params, workspace] = await Promise.all([
    searchParams,
    getWorkspace(),
  ])

  const requestedPeriod =
    getParam(params.period)

  const period: Period =
    requestedPeriod === "past" ||
    requestedPeriod === "all"
      ? requestedPeriod
      : "upcoming"

  const today = getToday(
    workspace.organizationTimezone
  )

  const supabase = await createClient()

  const serviceTimeAvailable =
    await hasServiceTimeColumn(supabase)

  let setlistQuery = supabase
    .from("setlists")
    .select("*")
    .eq(
      "organization_id",
      workspace.organizationId
    )
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

  const {
    data,
    error,
  } = await setlistQuery

  if (error) {
    redirect(
      "/error?code=setlists_load_failed"
    )
  }

  const setlists = (
    data ?? []
  ).map((setlist) => ({
    ...setlist,
    service_time:
      serviceTimeAvailable
        ? setlist.service_time
        : null,
  })) as Setlist[]

  const songCounts =
    new Map<string, number>()

  const assignmentsBySetlist =
    new Map<
      string,
      TeamAssignment[]
    >()

  if (setlists.length > 0) {
    const setlistIds =
      setlists.map(
        (setlist) => setlist.id
      )

    const [
      songsResult,
      assignmentsResult,
    ] = await Promise.all([
      supabase
        .from("setlist_songs")
        .select("setlist_id")
        .in(
          "setlist_id",
          setlistIds
        ),

      supabase
        .from(
          "setlist_team_assignments"
        )
        .select(
          "setlist_id, user_id, team_position, confirmation_status"
        )
        .in(
          "setlist_id",
          setlistIds
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        ),
    ])

    if (
      songsResult.error ||
      assignmentsResult.error
    ) {
      redirect(
        "/error?code=setlists_load_failed"
      )
    }

    for (const row of (
      songsResult.data ?? []
    ) as SetlistSong[]) {
      songCounts.set(
        row.setlist_id,
        (songCounts.get(
          row.setlist_id
        ) ?? 0) + 1
      )
    }

    for (const assignment of (
      assignmentsResult.data ?? []
    ) as TeamAssignment[]) {
      const assignments =
        assignmentsBySetlist.get(
          assignment.setlist_id
        ) ?? []

      assignments.push(
        assignment
      )

      assignmentsBySetlist.set(
        assignment.setlist_id,
        assignments
      )
    }
  }

  const assignedUserIds =
    Array.from(
      new Set(
        Array.from(
          assignmentsBySetlist.values()
        ).flatMap(
          (assignments) =>
            assignments.map(
              (assignment) =>
                assignment.user_id
            )
        )
      )
    )

  let profileNames =
    new Map<string, string>()

  let profilesById =
    new Map<
      string,
      MemberProfile
    >()

  let avatarUrls =
    new Map<string, string>()

  if (assignedUserIds.length > 0) {
    const {
      data: profiles,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url"
      )
      .in(
        "id",
        assignedUserIds
      )

    if (profilesError) {
      redirect(
        "/error?code=setlists_load_failed"
      )
    }

    const memberProfiles =
      (profiles ??
        []) as MemberProfile[]

    profilesById =
      new Map(
        memberProfiles.map(
          (profile) => [
            profile.id,
            profile,
          ]
        )
      )

    profileNames =
      new Map(
        memberProfiles.map(
          (profile) => [
            profile.id,
            profile.display_name
              ?.trim() ||
              "Name not set",
          ]
        )
      )

    avatarUrls =
      await getProfileAvatarUrlMap(
        supabase,
        memberProfiles.map(
          (profile) =>
            profile.avatar_url
        )
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

        <div className="flex flex-wrap gap-2">
          <Link
            href="/services/history"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          >
            <History className="size-4" />
            Service History
          </Link>
          <Link
            href="/setlists/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            <Plus className="size-4" />
            Plan a Service
          </Link>
        </div>
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
            aria-current={
              period === item.value
                ? "page"
                : undefined
            }
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
              {setlists.length === 1
                ? "service"
                : "services"}
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
            {setlists.map(
              (setlist) => {
                const assignments =
                  assignmentsBySetlist.get(
                    setlist.id
                  ) ?? []

                const songCount =
                  songCounts.get(
                    setlist.id
                  ) ?? 0

                const readiness =
                  getServiceReadiness(
                    setlist,
                    songCount,
                    assignments
                  )

                const readinessClasses =
                  getReadinessClasses(
                    readiness.status
                  )

                return (
                  <Link
                    key={setlist.id}
                    href={`/setlists/${setlist.id}`}
                    className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5">
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
                                  setlist.status ===
                                  "published"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : setlist.status ===
                                        "archived"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-[var(--surface)] text-[var(--muted)]"
                                }`}
                              >
                                {statusLabel(
                                  setlist.status
                                )}
                              </span>

                              {setlist.completed_at ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                                  <CheckCircle2 className="size-3" />
                                  Completed
                                </span>
                              ) : null}
                            </div>

                            {setlist.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                                {setlist.description}
                              </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="size-3.5" />
                                {formatDate(
                                  setlist.service_date
                                )}

                                {formatServiceTime(
                                  setlist.service_time
                                )
                                  ? ` · ${formatServiceTime(
                                      setlist.service_time
                                    )}`
                                  : ""}
                              </span>

                              <span>
                                {songCount}{" "}
                                {songCount ===
                                1
                                  ? "song"
                                  : "songs"}
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <Users className="size-3.5" />
                                {assignments.length}{" "}
                                {assignments.length ===
                                1
                                  ? "team member"
                                  : "team members"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="hidden size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)] md:block" />
                      </div>

                      <div className="grid gap-3 border-t border-[var(--border)] pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:items-center">
                        <div className="flex flex-wrap gap-2">
                          {assignments.length > 0 ? (
                            assignments.map(
                              (assignment) => (
                                <span
                                  key={`${assignment.user_id}-${assignment.team_position}`}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] py-1 pl-1 pr-2.5 text-xs text-[var(--foreground)]"
                                >
                                  <ProfileAvatar
                                    name={
                                      profileNames.get(
                                        assignment.user_id
                                      ) ??
                                      "Name not set"
                                    }
                                    imageUrl={
                                      avatarUrls.get(
                                        profilesById.get(
                                          assignment.user_id
                                        )?.avatar_url ??
                                          ""
                                      ) ?? null
                                    }
                                    sizeClassName="size-5"
                                    className="text-[8px]"
                                  />

                                  {profileNames.get(
                                    assignment.user_id
                                  ) ??
                                    "Name not set"}

                                  {" · "}

                                  {getTeamPositionLabel(
                                    assignment.team_position
                                  )}
                                </span>
                              )
                            )
                          ) : (
                            <span className="text-xs text-[var(--muted)]">
                              Team not assigned
                            </span>
                          )}
                        </div>

                        <div
                          className={`rounded-xl border px-3.5 py-3 ${readinessClasses.container}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${readinessClasses.icon}`}
                              >
                                {readiness.status ===
                                "ready" ? (
                                  <CheckCircle2 className="size-4" />
                                ) : readiness.status ===
                                  "attention" ? (
                                  <Clock3 className="size-4" />
                                ) : (
                                  <AlertCircle className="size-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p
                                  className={`text-xs font-semibold ${readinessClasses.text}`}
                                >
                                  Service readiness
                                </p>

                                <p
                                  className={`mt-0.5 text-[11px] ${readinessClasses.muted}`}
                                >
                                  {getReadinessLabel(
                                    readiness
                                  )}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-sm font-bold ${readinessClasses.text}`}
                            >
                              {readiness.percentage}%
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
                            <div
                              className={`h-full rounded-full transition-all ${readinessClasses.progress}`}
                              style={{
                                width: `${readiness.percentage}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                            <span
                              className={
                                readiness.hasSchedule
                                  ? readinessClasses.muted
                                  : "text-rose-700"
                              }
                            >
                              {readiness.hasSchedule
                                ? "Schedule set"
                                : "Schedule missing"}
                            </span>

                            <span
                              className={
                                readiness.hasSongs
                                  ? readinessClasses.muted
                                  : "text-rose-700"
                              }
                            >
                              {readiness.hasSongs
                                ? `${songCount} ${
                                    songCount === 1
                                      ? "song"
                                      : "songs"
                                  }`
                                : "No songs"}
                            </span>

                            <span
                              className={
                                readiness.hasTeam
                                  ? readinessClasses.muted
                                  : "text-rose-700"
                              }
                            >
                              {readiness.hasTeam
                                ? `${readiness.totalAssignments} ${
                                    readiness.totalAssignments ===
                                    1
                                      ? "member"
                                      : "members"
                                  }`
                                : "No team"}
                            </span>

                            {readiness.hasTeam ? (
                              <span
                                className={
                                  readiness.confirmedAssignments ===
                                  readiness.totalAssignments
                                    ? readinessClasses.muted
                                    : "text-amber-700"
                                }
                              >
                                {readiness.confirmedAssignments}/
                                {readiness.totalAssignments}{" "}
                                confirmed
                              </span>
                            ) : null}
                          </div>

                          {readiness.declinedAssignments >
                          0 ? (
                            <p className="mt-2 text-[10px] font-medium text-rose-700">
                              {readiness.declinedAssignments}{" "}
                              {readiness.declinedAssignments ===
                              1
                                ? "team member has"
                                : "team members have"}{" "}
                              declined.
                            </p>
                          ) : readiness.pendingAssignments >
                            0 ? (
                            <p className="mt-2 text-[10px] font-medium text-amber-700">
                              {readiness.pendingAssignments}{" "}
                              {readiness.pendingAssignments ===
                              1
                                ? "confirmation is"
                                : "confirmations are"}{" "}
                              still pending.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              }
            )}
          </div>
        )}
      </section>
    </main>
  )
}