import { Feedback } from "@/components/ui/feedback"
import { Input, Textarea } from "@/components/ui/form-controls"
import { PageContainer } from "@/components/ui/page"
import Link from "next/link"
import {
  ArrowRight,
  CalendarPlus,
  CalendarDays,
  Clock3,
  ListMusic,
  Plus,
  Trash2,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  formatServiceTime,
  getCalendarDateRange,
  isValidServiceDate,
} from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getTeamPositionLabel } from "@/lib/team-positions"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import AssignmentConfirmation from "./assignment-confirmation"
import ScheduleViewToggle from "./schedule-view-toggle"
import { requestAssignmentSwap } from "./swap-actions"
import { createAvailabilityEntry, deleteAvailabilityEntry } from "./availability-actions"

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

type AvailabilityEntry = {
  id: string
  entry_type: "blockout" | "recurring"
  title: string | null
  reason: string | null
  starts_on: string | null
  ends_on: string | null
  weekdays: number[] | null
  start_time: string | null
  end_time: string | null
  timezone: string
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatAvailabilityTime(value: string | null) {
  if (!value) return ""
  const [hour, minute] = value.split(":").map(Number)
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`
}

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

const swapErrorMessages: Record<string, string> = {
  invalid_request: "Choose an eligible substitute and keep the note within 500 characters.",
  assignment_unavailable: "That assignment is no longer available for a swap request.",
  substitute_not_eligible: "The selected teammate is not assigned to the required position.",
  substitute_already_assigned: "That teammate already has the same position in this service.",
  swap_already_open: "A swap request is already open for this assignment.",
  service_closed: "Completed or archived services cannot be swapped.",
  request_failed: "The swap request could not be created. Please try again.",
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
  const requestedCalendarDate = getParam(params.date)
  const initialSelectedDate =
    requestedCalendarDate && isValidServiceDate(requestedCalendarDate)
      ? requestedCalendarDate
      : today
  const initialView = getParam(params.view) === "calendar"
    ? "calendar"
    : "list"

  const supabase =
    await createClient()

  const serviceTimeAvailable =
    await hasServiceTimeColumn(
      supabase
    )


  // Availability is optional for older deployments until the new migration is applied.
  // Keep My Schedule usable if that table has not been deployed yet.
  const {
    data: availabilityData,
    error: availabilityLoadError,
  } = await supabase
    .from("member_availability")
    .select("id, entry_type, title, reason, starts_on, ends_on, weekdays, start_time, end_time, timezone")
    .eq("organization_id", workspace.organizationId)
    .eq("user_id", workspace.userId)
    .order("created_at", { ascending: false })

  const availabilityEntries = (availabilityData ?? []) as AvailabilityEntry[]

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
    <PageContainer>
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              <CalendarDays className="size-3.5" />
              Your Worship Team Schedule
            </span>

            <h1 className="wf-page-title mt-3">
              My Schedule
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Review services where you have been assigned, confirm your availability, and keep track of your worship team commitments.
            </p>
          </div>

          {pendingCount > 0 ? (
            <span className="wf-status wf-status-warning shrink-0">
              {pendingCount} pending {pendingCount === 1 ? "response" : "responses"}
            </span>
          ) : null}
        </div>
      </section>

      {getParam(params.swapRequested) === "1" ? (
        <Feedback tone="success" title="Swap request sent">
          Your proposed substitute and worship leaders have been notified.
        </Feedback>
      ) : null}
      {getParam(params.swapError) ? (
        <Feedback tone="error" title="Swap request could not be completed">
          {swapErrorMessages[getParam(params.swapError) ?? ""] ?? "Please try again."}
        </Feedback>
      ) : null}

      <section
        id="availability"
        className="wf-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
              <CalendarDays className="size-3.5" />
              Team coordination
            </span>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
              Availability &amp; time off
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Add dates you cannot serve or set your usual weekly availability so leaders can plan assignments with better context.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
            {availabilityEntries.length} {availabilityEntries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {getParam(params.availabilitySaved) === "1" ? (
          <div className="mt-4">
            <Feedback tone="success" title="Availability updated">
              Your saved availability is now reflected in your schedule.
            </Feedback>
          </div>
        ) : null}
        {getParam(params.availabilityError) ? (
          <div className="mt-4">
            <Feedback tone="error" title="Availability could not be updated">
              {getParam(params.availabilityError) === "invalid_entry"
                ? "Check the dates, days, and times and try again."
                : getParam(params.availabilityError) === "delete_failed"
                  ? "This availability entry could not be removed. Please try again."
                  : "Your availability could not be saved. Please try again."}
            </Feedback>
          </div>
        ) : null}
        {availabilityLoadError ? (
          <div className="mt-4">
            <Feedback tone="warning" title="Availability is temporarily unavailable">
              Your existing service schedule is still available. Ask your workspace administrator to verify that the availability migration has been applied.
            </Feedback>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <form action={createAvailabilityEntry} className="wf-card space-y-3 p-4">
                <input type="hidden" name="entryType" value="blockout" />
                <input type="hidden" name="timezone" value={workspace.organizationTimezone} />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Unavailable dates</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Use this for leave, travel, or a service you cannot attend.</p>
                </div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Title (optional)
                  <Input name="title" maxLength={120} placeholder="e.g. Family trip" className="mt-1.5 h-10" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Start date
                    <Input type="date" name="startsOn" required className="mt-1.5 h-10" />
                  </label>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    End date
                    <Input type="date" name="endsOn" required className="mt-1.5 h-10" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Note (optional)
                  <Textarea name="reason" maxLength={500} rows={2} placeholder="Add context for your team" className="mt-1.5 min-h-[72px] py-2" />
                </label>
                <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white transition hover:opacity-90">
                  <Plus className="size-4" />
                  Add blockout
                </button>
              </form>

              <form action={createAvailabilityEntry} className="wf-card space-y-3 p-4">
                <input type="hidden" name="entryType" value="recurring" />
                <input type="hidden" name="timezone" value={workspace.organizationTimezone} />
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Weekly availability</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Choose the days and times you are usually available to serve.</p>
                </div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Title (optional)
                  <Input name="title" maxLength={120} placeholder="e.g. Weekday evenings" className="mt-1.5 h-10" />
                </label>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-[var(--foreground)]">Days of the week</legend>
                  <div className="flex flex-wrap gap-2">
                    {weekdayLabels.map((day, index) => (
                      <label key={day} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs text-[var(--foreground)]">
                        <input type="checkbox" name="weekdays" value={index} />
                        {day}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Available from
                    <Input type="time" name="startTime" required className="mt-1.5 h-10" />
                  </label>
                  <label className="block text-sm font-medium text-[var(--foreground)]">
                    Available until
                    <Input type="time" name="endTime" required className="mt-1.5 h-10" />
                  </label>
                </div>
                <label className="block text-sm font-medium text-[var(--foreground)]">
                  Note (optional)
                  <Textarea name="reason" maxLength={500} rows={2} placeholder="Add context for your team" className="mt-1.5 min-h-[72px] py-2" />
                </label>
                <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white transition hover:opacity-90">
                  <Plus className="size-4" />
                  Add weekly availability
                </button>
              </form>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Saved entries</h3>
              {availabilityEntries.length === 0 ? (
                <div className="wf-card mt-3 border-dashed px-4 py-6 text-center">
                  <Clock3 className="mx-auto size-5 text-[var(--muted)]" />
                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">No availability entries yet</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Your blockouts and recurring availability will appear here.</p>
                </div>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {availabilityEntries.map((entry) => (
                    <article key={entry.id} className="wf-card flex items-start justify-between gap-3 p-3.5">
                      <div className="min-w-0">
                        <span className={`wf-status ${entry.entry_type === "blockout" ? "wf-status-warning" : "wf-status-success"}`}>
                          {entry.entry_type === "blockout" ? "Unavailable" : "Weekly availability"}
                        </span>
                        <h4 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {entry.title || (entry.entry_type === "blockout" ? "Unavailable dates" : "Recurring availability")}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                          {entry.entry_type === "blockout"
                            ? `${formatDate(entry.starts_on)} – ${formatDate(entry.ends_on)}`
                            : `${(entry.weekdays ?? []).slice().sort((a, b) => a - b).map((day) => weekdayLabels[day]).join(", ")} · ${formatAvailabilityTime(entry.start_time)}–${formatAvailabilityTime(entry.end_time)}`}
                        </p>
                        {entry.reason ? <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{entry.reason}</p> : null}
                      </div>
                      <form action={deleteAvailabilityEntry} className="shrink-0">
                        <input type="hidden" name="id" value={entry.id} />
                        <button type="submit" aria-label={`Delete ${entry.title || "availability entry"}`} className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>

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
                  : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
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
        availabilityEntries={availabilityEntries}
        today={today}
        initialSelectedDate={initialSelectedDate}
        initialView={initialView}
        timeZone={workspace.organizationTimezone}
        period={period}
        availabilityAvailable={!availabilityLoadError}
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
          <div className="wf-card border-dashed px-6 py-16 text-center">
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
                    className="wf-card flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
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
                                className={`wf-status ${
                                  assignment.confirmation_status === "confirmed"
                                    ? "wf-status-success"
                                    : assignment.confirmation_status === "declined"
                                      ? "wf-status-danger"
                                      : "wf-status-warning"
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
                                    <p className="mt-1 text-xs text-[var(--danger)]">Your last swap request was declined.</p>
                                  ) : null}
                                </div>
                                {!requestIsOpen && assignment.confirmation_status !== "declined" && candidates.length > 0 ? (
                                  <details className="shrink-0">
                                    <summary className="cursor-pointer list-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)]">
                                      Request a swap
                                    </summary>
                                    <form action={requestAssignmentSwap} className="wf-card mt-3 w-full space-y-3 p-3 sm:min-w-[300px]">
                                      <input type="hidden" name="assignmentId" value={assignment.id} />
                                      <div>
                                        <label htmlFor={`swap-substitute-${assignment.id}`} className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">Eligible substitute</label>
                                        <select
                                          id={`swap-substitute-${assignment.id}`}
                                          name="substituteUserId"
                                          required
                                          defaultValue=""
                                          className="wf-input h-10"
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
                                          className="wf-input min-h-[72px] py-2"
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
    </PageContainer>
  )
}