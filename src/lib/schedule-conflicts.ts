import { isValidServiceDate, isValidServiceTime } from "./service-scheduling"

export type ScheduledCommitment = {
  id: string
  name: string
  service_date: string | null
  service_time: string | null
}

export type ScheduleConflict = {
  serviceId: string
  serviceName: string
}

function getStartMinute(service: ScheduledCommitment) {
  if (
    !service.service_date ||
    !service.service_time ||
    !isValidServiceDate(service.service_date) ||
    !isValidServiceTime(service.service_time)
  ) {
    return null
  }

  const [year, month, day] = service.service_date.split("-").map(Number)
  const [hour, minute] = service.service_time.split(":").map(Number)
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
  return dayNumber * 1_440 + hour * 60 + minute
}

/**
 * Compare scheduled service windows using their workspace-local date and time.
 * The current service workflow creates one-hour calendar events, so one hour
 * is the consistent fallback until a service duration is explicitly stored.
 */
export function getScheduleConflicts(
  services: ScheduledCommitment[],
  durationMinutes = 60
): Map<string, ScheduleConflict[]> {
  const conflicts = new Map<string, ScheduleConflict[]>()
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return conflicts

  const scheduled = services
    .map((service) => ({
      service,
      start: getStartMinute(service),
    }))
    .filter(
      (entry): entry is { service: ScheduledCommitment; start: number } =>
        entry.start !== null
    )

  for (let index = 0; index < scheduled.length; index += 1) {
    const current = scheduled[index]
    const currentEnd = current.start + durationMinutes

    for (let nextIndex = index + 1; nextIndex < scheduled.length; nextIndex += 1) {
      const next = scheduled[nextIndex]
      const nextEnd = next.start + durationMinutes
      const overlaps = current.start < nextEnd && next.start < currentEnd
      if (!overlaps) continue

      const currentConflicts = conflicts.get(current.service.id) ?? []
      currentConflicts.push({
        serviceId: next.service.id,
        serviceName: next.service.name,
      })
      conflicts.set(current.service.id, currentConflicts)

      const nextConflicts = conflicts.get(next.service.id) ?? []
      nextConflicts.push({
        serviceId: current.service.id,
        serviceName: current.service.name,
      })
      conflicts.set(next.service.id, nextConflicts)
    }
  }

  return conflicts
}
