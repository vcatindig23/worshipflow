import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import {
  createPreparationTask,
  deletePreparationTask,
  saveRehearsalPlan,
  togglePreparationTask,
} from "../preparation-actions"

const editorRoles = ["admin", "worship_leader", "song_editor"]

type SetlistSchedule = {
  id: string
  name: string
  service_date: string | null
  service_time: string | null
  end_time: string | null
  status: string
  completed_at: string | null
  rehearsal_date: string | null
  rehearsal_time: string | null
  rehearsal_end_time: string | null
}

type PreparationTask = {
  id: string
  title: string
  details: string | null
  is_completed: boolean
  position: number
}

type ScheduleEvent = {
  key: string
  setlistId: string
  serviceName: string
  kind: "Service" | "Rehearsal"
  date: string
  startTime: string
  endTime: string
  startMinutes: number
  endMinutes: number
}

type ScheduleConflict = {
  current: ScheduleEvent
  other: ScheduleEvent
  memberNames: string[]
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function timeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\\d{1,2}):(\\d{2})/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function minutesToTime(value: number) {
  const safe = value % (24 * 60)
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled"
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function buildScheduleEvents(schedules: SetlistSchedule[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = []

  for (const schedule of schedules) {
    if (schedule.status === "archived" || schedule.completed_at) continue

    const serviceStart = timeToMinutes(schedule.service_time)
    if (schedule.service_date && serviceStart !== null) {
      const suppliedEnd = timeToMinutes(schedule.end_time)
      const serviceEnd =
        suppliedEnd !== null && suppliedEnd > serviceStart
          ? suppliedEnd
          : serviceStart + 60

      events.push({
        key: `${schedule.id}:service`,
        setlistId: schedule.id,
        serviceName: schedule.name,
        kind: "Service",
        date: schedule.service_date,
        startTime: schedule.service_time ?? "",
        endTime: minutesToTime(serviceEnd),
        startMinutes: serviceStart,
        endMinutes: serviceEnd,
      })
    }

    const rehearsalStart = timeToMinutes(schedule.rehearsal_time)
    if (schedule.rehearsal_date && rehearsalStart !== null) {
      const suppliedEnd = timeToMinutes(schedule.rehearsal_end_time)
      const rehearsalEnd =
        suppliedEnd !== null && suppliedEnd > rehearsalStart
          ? suppliedEnd
          : rehearsalStart + 90

      events.push({
        key: `${schedule.id}:rehearsal`,
        setlistId: schedule.id,
        serviceName: schedule.name,
        kind: "Rehearsal",
        date: schedule.rehearsal_date,
        startTime: schedule.rehearsal_time ?? "",
        endTime: minutesToTime(rehearsalEnd),
        startMinutes: rehearsalStart,
        endMinutes: rehearsalEnd,
      })
    }
  }

  return events
}

function formatTime(value: string) {
  const minutes = timeToMinutes(value)
  return minutes === null ? "Time not set" : minutesToTime(minutes)
}

function findScheduleConflicts(
  currentSetlistId: string,
  events: ScheduleEvent[],
  assignmentsBySetlist: Map<string, Set<string>>,
  memberNamesById: Map<string, string>
): ScheduleConflict[] {
  const currentEvents = events.filter((event) => event.setlistId === currentSetlistId)
  const conflicts = new Map<string, ScheduleConflict>()

  for (const current of currentEvents) {
    const currentMembers = assignmentsBySetlist.get(current.setlistId) ?? new Set<string>()

    for (const other of events) {
      if (current.key === other.key) continue
      if (current.date !== other.date) continue

      const sharedIds = [...currentMembers].filter((id) =>
        (assignmentsBySetlist.get(other.setlistId) ?? new Set<string>()).has(id)
      )
      if (sharedIds.length === 0) continue

      const overlaps =
        current.startMinutes < other.endMinutes &&
        other.startMinutes < current.endMinutes
      if (!overlaps) continue

      const key = [current.key, other.key].sort().join("|")
      if (conflicts.has(key)) continue

      conflicts.set(key, {
        current,
        other,
        memberNames: sharedIds
          .map((id) => memberNamesById.get(id) ?? "Team member")
          .sort((a, b) => a.localeCompare(b)),
      })
    }
  }

  return [...conflicts.values()].sort((a, b) =>
    a.current.date.localeCompare(b.current.date) ||
    a.current.startMinutes - b.current.startMinutes
  )
}

export default async function ServicePreparationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const queryParams = await searchParams
  const workspace = await getWorkspace()

  if (!workspace) redirect("/onboarding")

  const canEdit = editorRoles.includes(workspace.role)
  const supabase = await createClient()

  const [setlistResult, taskResult, schedulesResult] = await Promise.all([
    supabase
      .from("setlists")
      .select("id, name, service_date, service_time, end_time, status, completed_at, rehearsal_date, rehearsal_time, rehearsal_end_time, rehearsal_location, rehearsal_notes")
      .eq("id", id)
      .eq("organization_id", workspace.organizationId)
      .maybeSingle(),
    supabase
      .from("setlist_preparation_tasks")
      .select("id, title, details, is_completed, position")
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("setlists")
      .select("id, name, service_date, service_time, end_time, status, completed_at, rehearsal_date, rehearsal_time, rehearsal_end_time")
      .eq("organization_id", workspace.organizationId),
  ])

  if (setlistResult.error || taskResult.error || schedulesResult.error) {
    redirect(`/setlists/${id}/preparation?error=preparation_load_failed`)
  }
  if (!setlistResult.data) notFound()

  const setlist = setlistResult.data
  const tasks = (taskResult.data ?? []) as PreparationTask[]
  const schedules = (schedulesResult.data ?? []) as SetlistSchedule[]
  const scheduleIds = schedules.map((schedule) => schedule.id)

  const { data: assignmentRows, error: assignmentsError } = scheduleIds.length
    ? await supabase
        .from("setlist_team_assignments")
        .select("setlist_id, user_id")
        .in("setlist_id", scheduleIds)
    : { data: [], error: null }

  const assignmentsBySetlist = new Map<string, Set<string>>()
  for (const assignment of assignmentRows ?? []) {
    const members = assignmentsBySetlist.get(assignment.setlist_id) ?? new Set<string>()
    members.add(assignment.user_id)
    assignmentsBySetlist.set(assignment.setlist_id, members)
  }

  const events = buildScheduleEvents(schedules)
  const conflictsAvailable = !assignmentsError
  const sharedMemberIds = new Set<string>()

  if (conflictsAvailable) {
    const currentMembers = assignmentsBySetlist.get(id) ?? new Set<string>()
    for (const event of events.filter((candidate) =>
      candidate.setlistId !== id || candidate.kind !== "Service"
    )) {
      const candidateMembers = assignmentsBySetlist.get(event.setlistId) ?? new Set<string>()
      for (const userId of currentMembers) {
        if (candidateMembers.has(userId)) sharedMemberIds.add(userId)
      }
    }
  }

  const memberNamesById = new Map<string, string>()
  if (sharedMemberIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...sharedMemberIds])
    for (const profile of profiles ?? []) {
      memberNamesById.set(
        profile.id,
        profile.display_name?.trim() || "Team member"
      )
    }
  }

  const conflicts = conflictsAvailable
    ? findScheduleConflicts(id, events, assignmentsBySetlist, memberNamesById)
    : []

  const errorKey = getParam(queryParams.error)
  const saved = getParam(queryParams.saved)
  const errorMessages: Record<string, string> = {
    permission_denied: "You do not have permission to edit this service plan.",
    preparation_load_failed: "The rehearsal plan could not be loaded. Please refresh and try again.",
    invalid_rehearsal_date: "Enter a valid rehearsal date.",
    invalid_rehearsal_time: "Enter a valid rehearsal start time.",
    invalid_rehearsal_end_time: "Rehearsal end time must be later than the start time.",
    rehearsal_location_too_long: "The rehearsal location must be 200 characters or fewer.",
    rehearsal_notes_too_long: "Rehearsal notes must be 3,000 characters or fewer.",
    rehearsal_save_failed: "The rehearsal plan could not be saved.",
    task_invalid: "Checklist tasks need a title of 1–160 characters.",
    task_details_too_long: "Task details must be 1,000 characters or fewer.",
    task_save_failed: "The checklist task could not be added.",
    task_update_failed: "The checklist task could not be updated.",
    task_delete_failed: "The checklist task could not be deleted.",
  }

  const completedCount = tasks.filter((task) => task.is_completed).length

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-5 py-7 sm:px-6 lg:py-9">
      <Link
        href={`/setlists/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to service
      </Link>

      <header className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              <ClipboardCheck className="size-3.5" />
              Service preparation
            </span>
            <h1 className="wf-page-title mt-3">
              Rehearsal &amp; preparation
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Plan the next rehearsal, track preparation tasks, and spot overlapping commitments for your assigned team.
            </p>
            <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">
              {setlist.name}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Service: {formatDate(setlist.service_date)}{setlist.service_time ? ` · ${formatTime(setlist.service_time)}` : ""}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Preparation tasks</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {completedCount}<span className="text-base font-medium text-[var(--muted)]">/{tasks.length}</span>
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {tasks.length === 0 ? "No custom tasks yet" : completedCount === tasks.length ? "All tasks complete" : "Tasks completed"}
            </p>
          </div>
        </div>
      </header>

      {errorKey && errorMessages[errorKey] ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[errorKey]}
        </div>
      ) : null}
      {saved === "rehearsal" ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Rehearsal plan saved.
        </div>
      ) : saved === "task" ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Preparation task added.
        </div>
      ) : null}

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <CalendarDays className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Rehearsal plan</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Set a dedicated practice time and share where the team should meet.
            </p>
          </div>
        </div>

        {canEdit ? (
          <form action={saveRehearsalPlan} className="mt-5 space-y-4">
            <input type="hidden" name="setlistId" value={id} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="rehearsalDate" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Rehearsal date</label>
                <input id="rehearsalDate" name="rehearsalDate" type="date" defaultValue={setlist.rehearsal_date ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label htmlFor="rehearsalTime" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Start time</label>
                <input id="rehearsalTime" name="rehearsalTime" type="time" defaultValue={setlist.rehearsal_time?.slice(0, 5) ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label htmlFor="rehearsalEndTime" className="mb-2 block text-sm font-medium text-[var(--foreground)]">End time</label>
                <input id="rehearsalEndTime" name="rehearsalEndTime" type="time" min={setlist.rehearsal_time?.slice(0, 5) ?? undefined} defaultValue={setlist.rehearsal_end_time?.slice(0, 5) ?? ""} className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label htmlFor="rehearsalLocation" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Location</label>
                <input id="rehearsalLocation" name="rehearsalLocation" maxLength={200} defaultValue={setlist.rehearsal_location ?? ""} placeholder="e.g. Main sanctuary" className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
            <div>
              <label htmlFor="rehearsalNotes" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Rehearsal notes</label>
              <textarea id="rehearsalNotes" name="rehearsalNotes" maxLength={3000} rows={3} defaultValue={setlist.rehearsal_notes ?? ""} placeholder="Share what to practice, what to bring, or the order to work through." className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="flex justify-end">
              <FormSubmitButton pendingText="Saving rehearsal…" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:opacity-60">
                Save rehearsal plan
              </FormSubmitButton>
            </div>
          </form>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--surface)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">When</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{formatDate(setlist.rehearsal_date)}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {setlist.rehearsal_time ? formatTime(setlist.rehearsal_time) : "Start time not set"}
                {setlist.rehearsal_end_time ? ` – ${formatTime(setlist.rehearsal_end_time)}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface)] p-4">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"><MapPin className="size-3.5" /> Location</p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{setlist.rehearsal_location || "Location not set"}</p>
              {setlist.rehearsal_notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{setlist.rehearsal_notes}</p> : null}
            </div>
          </div>
        )}

        {(setlist.rehearsal_date || setlist.rehearsal_time || setlist.rehearsal_location) && canEdit ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <Clock3 className="size-4" />
            <span>
              {formatDate(setlist.rehearsal_date)}
              {setlist.rehearsal_time ? ` · ${formatTime(setlist.rehearsal_time)}` : ""}
              {setlist.rehearsal_end_time ? ` – ${formatTime(setlist.rehearsal_end_time)}` : ""}
            </span>
            {setlist.rehearsal_location ? <span>· {setlist.rehearsal_location}</span> : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Preparation checklist</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Add service-specific tasks such as confirming keys, checking equipment, or preparing transitions.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
            {completedCount} of {tasks.length} completed
          </span>
        </div>

        {tasks.length > 0 ? (
          <ul className="mt-5 space-y-2.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-3.5">
                {canEdit ? (
                  <form action={togglePreparationTask} className="pt-0.5">
                    <input type="hidden" name="setlistId" value={id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="completed" value={String(!task.is_completed)} />
                    <button type="submit" aria-label={task.is_completed ? `Reopen task: ${task.title}` : `Complete task: ${task.title}`} className={`flex size-8 items-center justify-center rounded-xl transition ${task.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"}`}>
                      {task.is_completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                    </button>
                  </form>
                ) : (
                  <span className={`mt-0.5 flex size-8 items-center justify-center rounded-xl ${task.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                    {task.is_completed ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${task.is_completed ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>{task.title}</p>
                  {task.details ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{task.details}</p> : null}
                </div>
                {canEdit ? (
                  <form action={deletePreparationTask}>
                    <input type="hidden" name="setlistId" value={id} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <ConfirmSubmitButton title="Delete this preparation task?" description="This task and its completion status will be permanently removed." confirmLabel="Delete task" type="submit" aria-label={`Delete task: ${task.title}`} className="flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]">
                      <Trash2 className="size-4" />
                    </ConfirmSubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
            <ClipboardCheck className="mx-auto size-6 text-[var(--muted)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">No custom tasks yet</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Build a short checklist that fits this service and rehearsal.</p>
          </div>
        )}

        {canEdit ? (
          <form action={createPreparationTask} className="mt-5 space-y-3 border-t border-[var(--border)] pt-5">
            <input type="hidden" name="setlistId" value={id} />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div>
                <label htmlFor="taskTitle" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Task</label>
                <input id="taskTitle" name="title" required minLength={1} maxLength={160} placeholder="e.g. Confirm all song keys" className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
              <div>
                <label htmlFor="taskDetails" className="mb-2 block text-sm font-medium text-[var(--foreground)]">Details (optional)</label>
                <input id="taskDetails" name="details" maxLength={1000} placeholder="Who owns it, or what needs to be checked?" className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]" />
              </div>
            </div>
            <div className="flex justify-end">
              <FormSubmitButton pendingText="Adding task…" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:opacity-60">
                <Plus className="size-4" />
                Add task
              </FormSubmitButton>
            </div>
          </form>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${conflicts.length > 0 ? "bg-amber-100 text-amber-700" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Scheduling conflicts</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Checks overlapping service and rehearsal times when the same team members are assigned.
            </p>
          </div>
          {conflictsAvailable ? (
            <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${conflicts.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {conflicts.length > 0 ? `${conflicts.length} to review` : "No conflicts"}
            </span>
          ) : null}
        </div>

        {!conflictsAvailable ? (
          <p role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Conflict checking is temporarily unavailable because the assignment schedule could not be loaded.
          </p>
        ) : conflicts.length > 0 ? (
          <ul className="mt-5 space-y-3">
            {conflicts.map((conflict) => (
              <li key={`${conflict.current.key}|${conflict.other.key}`} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {conflict.current.kind} overlaps with {conflict.other.kind.toLowerCase()}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {conflict.current.kind}: {formatDate(conflict.current.date)} · {formatTime(conflict.current.startTime)}–{conflict.current.endTime}
                    </p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {conflict.other.serviceName} · {formatDate(conflict.other.date)} · {formatTime(conflict.other.startTime)}–{conflict.other.endTime}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-amber-900">
                      Shared assigned team: {conflict.memberNames.join(", ")}
                    </p>
                  </div>
                  <Link href={`/setlists/${conflict.other.setlistId}`} className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100">
                    View plan
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl bg-[var(--surface)] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            No overlapping commitments were found for shared team members. Services without an end time are estimated at 60 minutes; rehearsals without an end time are estimated at 90 minutes.
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          This is a planning warning, not an automatic assignment blocker. Confirm actual event durations and availability with the team.
        </p>
      </section>
    </main>
  )
}
