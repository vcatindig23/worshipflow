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
import AssignmentConfirmation from "./assignment-confirmation"
import ScheduleViewToggle from "./schedule-view-toggle"
import { requestAssignmentSwap } from "./swap-actions"

type MySchedulePageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Assignment = {
  id: string
  setlist_id: string
  team_position: string
  confirmation_status:
    | "pending"
    | "confirmed"
    | "declined"
  responded_at: string | null
  response_note: string | null
}

type Setlist = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
}

type WorkspaceMember = {
  user_id: string
  team_positions: string[]
}

type SwapRequest = {
  id: string
  assignment_id: string
  substitute_user_id: string
  status: "pending" | "substitute_accepted" | "approved" | "declined" | "cancelled"
  created_at: string
}

type Period =
  | "upcoming"
  | "past"
  | "all"

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

function getToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date())

  const part = (type: string) =>
    parts.find(
      (item) => item.type === type
    )?.value ?? ""

  return `${part("year")}-${part(
    "month"
  )}-${part("day")}`
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date not set"
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      dateStyle: "full",
    }
  ).format(
    new Date(`${value}T00:00:00`)
  )
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
      (position) =>
        `Assigned position: ${getTeamPositionLabel(
          position
        )}`
    ),
    ...(setlist.description
      ? [setlist.description]
      : []),
  ].join("\n")

  const parameters =
    new URLSearchParams({
      action: "TEMPLATE",
      text: setlist.name,
      dates: getCalendarDateRange(
        setlist.service_date,
        setlist.service_time
      ),
      details,
    })

  if (setlist.service_time) {
    parameters.set(
      "ctz",
      timeZone
    )
  }

  return `https://calendar.google.com/calendar/render?${parameters.toString()}`
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

export default async function MySchedulePage({
  searchParams,
}: MySchedulePageProps) {
  const [
    params,
    workspace,
  ] = await Promise.all([
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

  const supabase =
    await createClient()

  const serviceTimeAvailable =
    await hasServiceTimeColumn(
      supabase
    )

  const {
    data: assignments,
    error: assignmentsError,
  } = await supabase
    .from(
      "setlist_team_assignments"
    )
    .select(
      "id, setlist_id, team_position, confirmation_status, responded_at, response_note"
    )
    .eq(
      "user_id",
      workspace.userId
    )
    .order("created_at", {
      ascending: true,
    })

  if (assignmentsError) {
    redirect(
      "/error?code=setlists_load_failed"
    )
  }

  const memberAssignments =
    (assignments ??
      []) as Assignment[]

  const setlistIds = Array.from(
    new Set(
      memberAssignments.map(
        (assignment) =>
          assignment.setlist_id
      )
    )
  )

  const assignmentIds = memberAssignments.map((assignment) => assignment.id)
  const [membersResult, swapRequestsResult, serviceAssignmentsResult] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, team_positions")
      .eq("organization_id", workspace.organizationId),
    assignmentIds.length > 0
      ? supabase
          .from("setlist_assignment_swap_requests")
          .select("id, assignment_id, substitute_user_id, status, created_at")
          .eq("organization_id", workspace.organizationId)
          .in("assignment_id", assignmentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    setlistIds.length > 0
      ? supabase
          .from("setlist_team_assignments")
          .select("setlist_id, user_id, team_position")
          .in("setlist_id", setlistIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const workspaceMembers = (membersResult.data ?? []) as WorkspaceMember[]
  const swapFeatureAvailable = !swapRequestsResult.error && !membersResult.error && !serviceAssignmentsResult.error
  const swapRequests = (swapRequestsResult.data ?? []) as SwapRequest[]
  const latestSwapByAssignment = new Map<string, SwapRequest>()
  for (const request of swapRequests) {
    if (!latestSwapByAssignment.has(request.assignment_id)) {
      latestSwapByAssignment.set(request.assignment_id, request)
    }
  }

  const occupiedPositionsBySetlist = new Map<string, Set<string>>()
  for (const assignment of serviceAssignmentsResult.data ?? []) {
    const key = `${assignment.setlist_id}|${assignment.team_position}`
    const occupied = occupiedPositionsBySetlist.get(key) ?? new Set<string>()
    occupied.add(assignment.user_id)
    occupiedPositionsBySetlist.set(key, occupied)
  }

  const namesByMemberId = new Map<string, string>()
  if (workspaceMembers.length > 0) {
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", workspaceMembers.map((member) => member.user_id))

    for (const profile of memberProfiles ?? []) {
      namesByMemberId.set(profile.id, profile.display_name?.trim() || "Team member")
    }
  }

  let setlists: Setlist[] = []

  if (setlistIds.length > 0) {
    let query = supabase
      .from("setlists")
      .select("*")
      .eq(
        "organization_id",
        workspace.organizationId
      )
      .in(
        "id",
        setlistIds
      )
      .order(
        "service_date",
        {
          ascending:
            period !== "past",
          nullsFirst: false,
        }
      )

    if (period === "upcoming") {
      query = query
        .gte(
          "service_date",
          today
        )
        .neq(
          "status",
          "archived"
        )
    } else if (
      period === "past"
    ) {
      query = query
        .not(
          "service_date",
          "is",
          null
        )
        .lt(
          "service_date",
          today
        )
    }

    const {
      data,
      error,
    } = await query

    if (error) {
      redirect(
        "/error?code=setlists_load_failed"
      )
    }

    setlists =
      (data ?? []).map(
        (setlist) => ({
          ...setlist,
          service_time:
            serviceTimeAvailable
              ? setlist.service_time
              : null,
        })
      ) as Setlist[]
  }

  const assignmentsBySetlist =
    new Map<
      string,
      Assignment[]
    >()

  for (const assignment of memberAssignments) {
    const existing =
      assignmentsBySetlist.get(
        assignment.setlist_id
      ) ?? []

    existing.push(
      assignment
    )

    assignmentsBySetlist.set(
      assignment.setlist_id,
      existing
    )
  }

  const positionsBySetlist =
    new Map<
      string,
      string[]
    >()

  for (const assignment of memberAssignments) {
    const positions =
      positionsBySetlist.get(
        assignment.setlist_id
      ) ?? []

    positions.push(
      assignment.team_position
    )

    positionsBySetlist.set(
      assignment.setlist_id,
      positions
    )
  }

  const calendarUrlsBySetlist =
    new Map(
      setlists.map(
        (setlist) => [
          setlist.id,
          getGoogleCalendarUrl(
            setlist,
            positionsBySetlist.get(
              setlist.id
            ) ?? [],
            workspace.organizationTimezone
          ),
        ]
      )
    )

  const pendingCount =
    setlists.reduce(
      (total, setlist) =>
        total +
        (
          assignmentsBySetlist.get(
            setlist.id
          ) ?? []
        ).filter(
          (assignment) =>
            assignment.confirmation_status ===
            "pending"
        ).length,
      0
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
              Review services where you have been assigned, confirm your availability, and keep track of your worship team commitments.
            </p>
          </div>

          {pendingCount > 0 ? (
            <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-amber-800">
                {pendingCount}{" "}
                pending{" "}
                {pendingCount === 1
                  ? "response"
                  : "responses"}
              </p>

              <p className="mt-0.5 text-[11px] text-amber-700">
                Please review your assignments.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {getParam(params.swapRequested) === "1" ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Swap request sent. Your proposed substitute and worship leaders have been notified.
        </div>
      ) : null}
      {getParam(params.swapError) ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{
            invalid_request: "Choose an eligible substitute and keep the note within 500 characters.",
            assignment_unavailable: "That assignment is no longer available for a swap request.",
            substitute_not_eligible: "The selected teammate is not assigned to the required position.",
            substitute_already_assigned: "That teammate already has the same position in this service.",
            swap_already_open: "A swap request is already open for this assignment.",
            service_closed: "Completed or archived services cannot be swapped.",
            request_failed: "The swap request could not be created. Please try again.",
          }[getParam(params.swapError) ?? ""] ?? "The swap request could not be completed."}
        </div>
      ) : null}

      <nav
        aria-label="My service schedule"
        className="flex flex-wrap gap-2"
      >
        {periods.map(
          (item) => (
            <Link
              key={item.value}
              href={
                item.value ===
                "upcoming"
                  ? "/my-schedule"
                  : `/my-schedule?period=${item.value}`
              }
              aria-current={
                period ===
                item.value
                  ? "page"
                  : undefined
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                period ===
                item.value
                  ? "bg-[var(--brand)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          )
        )}
      </nav>

      <ScheduleViewToggle
        entries={setlists.map((setlist) => ({
          id: setlist.id,
          name: setlist.name,
          description: setlist.description,
          service_date: setlist.service_date,
          service_time: setlist.service_time,
          status: setlist.status,
        }))}
      >
      <section>
        <p className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          {setlists.length}{" "}
          {setlists.length === 1
            ? "service"
            : "services"}
        </p>

        {setlists.length ===
        0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <CalendarDays className="size-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              {period ===
              "upcoming"
                ? "No upcoming assignments"
                : period ===
                    "past"
                  ? "No past assignments"
                  : "No service assignments yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {period ===
              "upcoming"
                ? "When a worship leader schedules you for a service, it will appear here."
                : period ===
                    "past"
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
            {setlists.map(
              (setlist) => {
                const assignmentsForService =
                  assignmentsBySetlist.get(
                    setlist.id
                  ) ?? []

                return (
                  <div
                    key={setlist.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
                              {setlist.status ===
                              "published"
                                ? "Published"
                                : setlist.status ===
                                    "archived"
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
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {(
                              positionsBySetlist.get(
                                setlist.id
                              ) ?? []
                            ).map(
                              (
                                position
                              ) => (
                                <span
                                  key={
                                    position
                                  }
                                  className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--brand)]"
                                >
                                  {getTeamPositionLabel(
                                    position
                                  )}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <ArrowRight className="mt-1 size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
                      </Link>

                      <AssignmentConfirmation
                        assignmentId={
                          assignmentsForService[0]
                            ?.id ?? ""
                        }
                        status={
                          assignmentsForService[0]
                            ?.confirmation_status ??
                          "pending"
                        }
                        responseNote={
                          assignmentsForService[0]
                            ?.response_note ??
                          null
                        }
                        respondedAt={
                          assignmentsForService[0]
                            ?.responded_at ??
                          null
                        }
                        timeZone={
                          workspace.organizationTimezone
                        }
                      />
                    </div>

                    {assignmentsForService.length >
                    1 ? (
                      <div className="border-t border-[var(--border)] pt-3">
                        <p className="text-[11px] font-medium text-[var(--muted)]">
                          You have{" "}
                          {
                            assignmentsForService.length
                          }{" "}
                          assigned positions for this service.
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {assignmentsForService.map(
                            (
                              assignment
                            ) => (
                              <span
                                key={
                                  assignment.id
                                }
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  assignment.confirmation_status ===
                                  "confirmed"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : assignment.confirmation_status ===
                                        "declined"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {getTeamPositionLabel(
                                  assignment.team_position
                                )}
                                {" · "}
                                {assignment.confirmation_status ===
                                "confirmed"
                                  ? "Confirmed"
                                  : assignment.confirmation_status ===
                                      "declined"
                                    ? "Declined"
                                    : "Pending"}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}

                    {swapFeatureAvailable && assignmentsForService.length > 0 && setlist.status !== "archived" && (!setlist.service_date || setlist.service_date >= today) && period !== "past" ? (
                      <div className="space-y-3 border-t border-[var(--border)] pt-3">
                        <p className="text-xs font-semibold text-[var(--foreground)]">Need a substitute?</p>
                        {assignmentsForService.map((assignment) => {
                          const previousRequest = latestSwapByAssignment.get(assignment.id)
                          const requestIsOpen = previousRequest?.status === "pending" || previousRequest?.status === "substitute_accepted"
                          const candidates = workspaceMembers.filter((member) =>
                            member.user_id !== workspace.userId &&
                            member.team_positions.includes(assignment.team_position) &&
                            !(occupiedPositionsBySetlist.get(`${setlist.id}|${assignment.team_position}`) ?? new Set<string>()).has(member.user_id)
                          )

                          return (
                            <div key={assignment.id} className="rounded-xl bg-[var(--surface)] p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[var(--foreground)]">
                                    {getTeamPositionLabel(assignment.team_position)}
                                  </p>
                                  {previousRequest && requestIsOpen ? (
                                    <p className="mt-1 text-xs text-[var(--muted)]">
                                      {previousRequest.status === "pending"
                                        ? `Swap request sent to ${namesByMemberId.get(previousRequest.substitute_user_id) ?? "your proposed substitute"}; waiting for their response.`
                                        : "Your proposed substitute accepted. Waiting for worship-leader approval."}
                                    </p>
                                  ) : previousRequest?.status === "declined" ? (
                                    <p className="mt-1 text-xs text-rose-700">Your last swap request was declined.</p>
                                  ) : null}
                                </div>
                                {!requestIsOpen && assignment.confirmation_status !== "declined" && candidates.length > 0 ? (
                                  <details className="shrink-0">
                                    <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]">
                                      Request a swap
                                    </summary>
                                    <form action={requestAssignmentSwap} className="mt-3 w-full space-y-3 rounded-xl border border-[var(--border)] bg-white p-3 sm:min-w-[300px]">
                                      <input type="hidden" name="assignmentId" value={assignment.id} />
                                      <div>
                                        <label htmlFor={`swap-substitute-${assignment.id}`} className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">Eligible substitute</label>
                                        <select
                                          id={`swap-substitute-${assignment.id}`}
                                          name="substituteUserId"
                                          required
                                          defaultValue=""
                                          className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                                        >
                                          <option value="" disabled>Select a teammate</option>
                                          {candidates.map((member) => (
                                            <option key={member.user_id} value={member.user_id}>
                                              {namesByMemberId.get(member.user_id) ?? "Team member"}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label htmlFor={`swap-reason-${assignment.id}`} className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">Reason (optional)</label>
                                        <textarea
                                          id={`swap-reason-${assignment.id}`}
                                          name="reason"
                                          maxLength={500}
                                          rows={2}
                                          placeholder="Share why you need a substitute."
                                          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
                                        />
                                      </div>
                                      <button type="submit" className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]">
                                        Send swap request
                                      </button>
                                    </form>
                                  </details>
                                ) : !requestIsOpen && candidates.length === 0 ? (
                                  <p className="text-xs text-[var(--muted)]">No eligible substitute is available for this position.</p>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    {calendarUrlsBySetlist.get(
                      setlist.id
                    ) ? (
                      <div className="flex justify-end border-t border-[var(--border)] pt-3">
                        <a
                          href={
                            calendarUrlsBySetlist.get(
                              setlist.id
                            ) ??
                            undefined
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                        >
                          <CalendarPlus className="size-3.5" />
                          Add to Google Calendar
                        </a>
                      </div>
                    ) : null}
                  </div>
                )
              }
            )}
          </div>
        )}
      </section>
      </ScheduleViewToggle>
    </main>
  )
}