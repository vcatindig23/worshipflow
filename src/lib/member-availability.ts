export type MemberAvailabilityEntry = {
  user_id: string
  entry_type: "blockout" | "recurring"
  starts_on: string | null
  ends_on: string | null
  weekdays: number[] | null
  start_time: string | null
  end_time: string | null
  timezone: string
}

export type MemberAvailabilityStatus =
  | "unavailable"
  | "outside_weekly_hours"
  | "within_weekly_hours"
  | "not_recorded"
  | "needs_schedule"

export type MemberAvailabilityAssessment = {
  status: MemberAvailabilityStatus
  label: string
}

type AssessmentInput = {
  userId: string
  serviceDate: string | null
  serviceTime: string | null
  serviceEndTime: string | null
  serviceTimezone: string
}

type ZonedParts = {
  date: string
  weekday: number
  minutes: number
}

const weekdayNumbers: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const timestamp = Date.UTC(year, month - 1, day)
  const date = new Date(timestamp)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day, timestamp }
}

function parseTime(value: string | null) {
  if (!value) return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function getZonedParts(timestamp: number, timezone: string): ZonedParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp))

    const read = (type: string) => parts.find((part) => part.type === type)?.value
    const year = Number(read("year"))
    const month = Number(read("month"))
    const day = Number(read("day"))
    const hour = Number(read("hour"))
    const minute = Number(read("minute"))
    const weekday = weekdayNumbers[read("weekday") ?? ""]

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      weekday === undefined
    ) {
      return null
    }

    return {
      date:
        String(year).padStart(4, "0") +
        "-" +
        String(month).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0"),
      weekday,
      minutes: hour * 60 + minute,
    }
  } catch {
    return null
  }
}

function getInstantForZonedDateTime(dateValue: string, timeValue: string, timezone: string) {
  const date = parseDate(dateValue)
  const minutes = parseTime(timeValue)
  if (!date || minutes === null) return null

  const target = date.timestamp + minutes * 60_000
  let guess = target

  // Correct the UTC guess against the target zone. Iteration handles ordinary
  // UTC offsets and daylight-saving transitions without relying on server TZ.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = getZonedParts(guess, timezone)
    if (!local) return null

    const localDate = parseDate(local.date)
    if (!localDate) return null

    const localAsUtc = localDate.timestamp + local.minutes * 60_000
    const correction = target - localAsUtc
    guess += correction

    if (correction === 0) break
  }

  const resolved = getZonedParts(guess, timezone)
  if (!resolved || resolved.date !== dateValue || resolved.minutes !== minutes) {
    return null
  }

  return guess
}

function assessment(
  status: MemberAvailabilityStatus
): MemberAvailabilityAssessment {
  const labels: Record<MemberAvailabilityStatus, string> = {
    unavailable: "Unavailable · time off",
    outside_weekly_hours: "Outside usual hours",
    within_weekly_hours: "Within usual hours",
    not_recorded: "No availability details",
    needs_schedule: "Set service time to check",
  }

  return { status, label: labels[status] }
}

export function assessMemberAvailability(
  entries: MemberAvailabilityEntry[],
  input: AssessmentInput
): MemberAvailabilityAssessment {
  const memberEntries = entries.filter((entry) => entry.user_id === input.userId)

  if (!input.serviceDate || !parseDate(input.serviceDate)) {
    return assessment(memberEntries.length > 0 ? "needs_schedule" : "not_recorded")
  }

  const blockoutMatches = memberEntries.some((entry) =>
    entry.entry_type === "blockout" &&
    Boolean(entry.starts_on && entry.ends_on) &&
    entry.starts_on! <= input.serviceDate! &&
    entry.ends_on! >= input.serviceDate!
  )

  if (blockoutMatches) {
    return assessment("unavailable")
  }

  const recurringEntries = memberEntries.filter(
    (entry) => entry.entry_type === "recurring"
  )

  if (recurringEntries.length === 0) {
    return assessment("not_recorded")
  }

  const startMinutes = parseTime(input.serviceTime)
  if (startMinutes === null) {
    return assessment("needs_schedule")
  }

  const suppliedEndMinutes = parseTime(input.serviceEndTime)
  const duration =
    suppliedEndMinutes !== null && suppliedEndMinutes > startMinutes
      ? suppliedEndMinutes - startMinutes
      : 60

  const startInstant = getInstantForZonedDateTime(
    input.serviceDate,
    input.serviceTime!,
    input.serviceTimezone
  )

  if (startInstant === null || !Number.isFinite(startInstant)) {
    return assessment("needs_schedule")
  }

  const endInstant = startInstant + duration * 60_000

  const fitsRecurringWindow = recurringEntries.some((entry) => {
    const availableStart = parseTime(entry.start_time)
    const availableEnd = parseTime(entry.end_time)
    if (
      !entry.weekdays?.length ||
      availableStart === null ||
      availableEnd === null ||
      availableEnd <= availableStart
    ) {
      return false
    }

    const timezone = entry.timezone || input.serviceTimezone
    const localStart = getZonedParts(startInstant, timezone)
    const localEnd = getZonedParts(endInstant, timezone)
    if (!localStart || !localEnd || localStart.date !== localEnd.date) {
      return false
    }

    return (
      entry.weekdays.includes(localStart.weekday) &&
      localStart.minutes >= availableStart &&
      localEnd.minutes <= availableEnd
    )
  })

  return assessment(
    fitsRecurringWindow ? "within_weekly_hours" : "outside_weekly_hours"
  )
}
