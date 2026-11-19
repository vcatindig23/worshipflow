export type SetlistSchedule = {
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
  service_prep_buffer_minutes?: number | null
  service_travel_buffer_minutes?: number | null
  rehearsal_prep_buffer_minutes?: number | null
  rehearsal_travel_buffer_minutes?: number | null
}

export type ScheduleEvent = {
  key: string
  setlistId: string
  serviceName: string
  kind: "Service" | "Rehearsal"
  date: string
  startTime: string
  endTime: string
  startMinutes: number
  endMinutes: number
  conflictStartAtMinute: number
  conflictEndAtMinute: number
  prepBufferMinutes: number
  travelBufferMinutes: number
}

export type ScheduleConflict = {
  current: ScheduleEvent
  other: ScheduleEvent
  memberNames: string[]
}

export function timeToMinutes(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\\d{1,2}):(\\d{2})/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function minutesToTime(value: number) {
  const safe = ((value % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function dateToDayNumber(value: string) {
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const parsed = new Date(timestamp)

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return Math.floor(timestamp / 86_400_000)
}

function getBufferMinutes(value: number | null | undefined) {
  return Number.isInteger(value) && value! >= 0 && value! <= 240
    ? value!
    : 0
}

function createScheduleEvent(input: {
  key: string
  setlistId: string
  serviceName: string
  kind: "Service" | "Rehearsal"
  date: string
  startTime: string
  startMinutes: number
  endMinutes: number
  prepBufferMinutes: number | null | undefined
  travelBufferMinutes: number | null | undefined
}): ScheduleEvent | null {
  const dayNumber = dateToDayNumber(input.date)
  if (dayNumber === null || input.endMinutes <= input.startMinutes) return null

  const prepBufferMinutes = getBufferMinutes(input.prepBufferMinutes)
  const travelBufferMinutes = getBufferMinutes(input.travelBufferMinutes)
  const absoluteStart = dayNumber * 1440 + input.startMinutes
  const absoluteEnd = dayNumber * 1440 + input.endMinutes

  return {
    key: input.key,
    setlistId: input.setlistId,
    serviceName: input.serviceName,
    kind: input.kind,
    date: input.date,
    startTime: input.startTime,
    endTime: minutesToTime(input.endMinutes),
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    conflictStartAtMinute: absoluteStart - prepBufferMinutes,
    conflictEndAtMinute: absoluteEnd + travelBufferMinutes,
    prepBufferMinutes,
    travelBufferMinutes,
  }
}

export function buildScheduleEvents(schedules: SetlistSchedule[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = []

  for (const schedule of schedules) {
    if (schedule.status === "archived" || schedule.completed_at) continue

    const serviceStart = timeToMinutes(schedule.service_time)
    const serviceDay = schedule.service_date
      ? dateToDayNumber(schedule.service_date)
      : null

    if (serviceDay !== null && serviceStart !== null) {
      const suppliedEnd = timeToMinutes(schedule.end_time)
      const serviceEnd =
        suppliedEnd !== null && suppliedEnd > serviceStart
          ? suppliedEnd
          : serviceStart + 60

      const event = createScheduleEvent({
        key: `${schedule.id}:service`,
        setlistId: schedule.id,
        serviceName: schedule.name,
        kind: "Service",
        date: schedule.service_date!,
        startTime: schedule.service_time!,
        startMinutes: serviceStart,
        endMinutes: serviceEnd,
        prepBufferMinutes: schedule.service_prep_buffer_minutes,
        travelBufferMinutes: schedule.service_travel_buffer_minutes,
      })

      if (event) events.push(event)
    }

    const rehearsalStart = timeToMinutes(schedule.rehearsal_time)
    const rehearsalDay = schedule.rehearsal_date
      ? dateToDayNumber(schedule.rehearsal_date)
      : null

    if (rehearsalDay !== null && rehearsalStart !== null) {
      const suppliedEnd = timeToMinutes(schedule.rehearsal_end_time)
      const rehearsalEnd =
        suppliedEnd !== null && suppliedEnd > rehearsalStart
          ? suppliedEnd
          : rehearsalStart + 90

      const event = createScheduleEvent({
        key: `${schedule.id}:rehearsal`,
        setlistId: schedule.id,
        serviceName: schedule.name,
        kind: "Rehearsal",
        date: schedule.rehearsal_date!,
        startTime: schedule.rehearsal_time!,
        startMinutes: rehearsalStart,
        endMinutes: rehearsalEnd,
        prepBufferMinutes: schedule.rehearsal_prep_buffer_minutes,
        travelBufferMinutes: schedule.rehearsal_travel_buffer_minutes,
      })

      if (event) events.push(event)
    }
  }

  return events
}

export function findScheduleConflicts(
  currentSetlistId: string,
  events: ScheduleEvent[],
  assignmentsBySetlist: Map<string, Set<string>>,
  memberNamesById: Map<string, string>,
  onlyMemberId?: string
): ScheduleConflict[] {
  const currentEvents = events.filter((event) => event.setlistId === currentSetlistId)
  const conflicts = new Map<string, ScheduleConflict>()

  for (const current of currentEvents) {
    const currentMembers = assignmentsBySetlist.get(current.setlistId) ?? new Set<string>()

    for (const other of events) {
      if (current.key === other.key) continue

      const sharedIds = [...currentMembers].filter((id) =>
        (!onlyMemberId || id === onlyMemberId) &&
        (assignmentsBySetlist.get(other.setlistId) ?? new Set<string>()).has(id)
      )
      if (sharedIds.length === 0) continue

      // Compare absolute minute ranges so a buffer can correctly extend
      // across midnight into the previous or following calendar date.
      const overlaps =
        current.conflictStartAtMinute < other.conflictEndAtMinute &&
        other.conflictStartAtMinute < current.conflictEndAtMinute
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
    a.current.conflictStartAtMinute - b.current.conflictStartAtMinute ||
    a.other.conflictStartAtMinute - b.other.conflictStartAtMinute
  )
}

/**
 * Evaluates a proposed member assignment without mutating the existing
 * schedule. Declined assignments are excluded by the caller; pending and
 * confirmed assignments remain active commitments.
 */
export function findProposedMemberScheduleConflicts(
  currentSetlistId: string,
  proposedMemberId: string,
  events: ScheduleEvent[],
  assignmentsBySetlist: Map<string, Set<string>>,
  memberNamesById: Map<string, string> = new Map()
): ScheduleConflict[] {
  const proposedAssignments = new Map(assignmentsBySetlist)
  const currentMembers = new Set(
    proposedAssignments.get(currentSetlistId) ?? []
  )

  currentMembers.add(proposedMemberId)
  proposedAssignments.set(currentSetlistId, currentMembers)

  return findScheduleConflicts(
    currentSetlistId,
    events,
    proposedAssignments,
    memberNamesById,
    proposedMemberId
  )
}

/**
 * Stable snapshot identifier for the exact conflict windows a leader reviewed.
 * The server compares it with a fresh calculation when the form is submitted.
 */
export function getScheduleConflictSignature(conflicts: ScheduleConflict[]) {
  const eventSignature = (event: ScheduleEvent) =>
    `${event.key}@${event.date}:${event.startMinutes}-${event.endMinutes}:${event.conflictStartAtMinute}-${event.conflictEndAtMinute}:${event.serviceName}`

  return conflicts
    .map((conflict) =>
      [eventSignature(conflict.current), eventSignature(conflict.other)]
        .sort()
        .join("::")
    )
    .sort((a, b) => a.localeCompare(b))
    .join("|")
}

export type ScheduleAssignmentRecord = {
  setlist_id: string
  user_id: string
  confirmation_status?: string | null
}

/**
 * Builds active member commitments for conflict checks. A declined assignment
 * is no longer a scheduled commitment; pending and confirmed assignments are.
 */
export function buildActiveScheduleAssignmentsMap(
  assignments: ScheduleAssignmentRecord[]
) {
  const assignmentsBySetlist = new Map<string, Set<string>>()

  for (const assignment of assignments) {
    if (assignment.confirmation_status === "declined") continue

    const members = assignmentsBySetlist.get(assignment.setlist_id) ?? new Set<string>()
    members.add(assignment.user_id)
    assignmentsBySetlist.set(assignment.setlist_id, members)
  }

  return assignmentsBySetlist
}
