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
  const safe = value % (24 * 60)
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  const suffix = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

export function buildScheduleEvents(schedules: SetlistSchedule[]): ScheduleEvent[] {
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
      if (current.date !== other.date) continue

      const sharedIds = [...currentMembers].filter((id) =>
        (!onlyMemberId || id === onlyMemberId) &&
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
