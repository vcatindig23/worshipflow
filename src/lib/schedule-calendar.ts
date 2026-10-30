export type AvailabilityCalendarEntry = {
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

export type DateAvailability = {
  blockouts: AvailabilityCalendarEntry[]
  recurring: AvailabilityCalendarEntry[]
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day, weekday: date.getUTCDay() }
}

/**
 * Returns a Monday-first month grid. Null values represent days outside the
 * visible month so the calendar always has complete weeks.
 */
export function getCalendarMonthCells(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const leadingDays = (firstDay + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: Array<string | null> = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }),
  ]

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/**
 * Resolves date-specific time-off ranges and weekly availability without
 * depending on the browser or server's local timezone.
 */
export function getAvailabilityForDate(
  entries: AvailabilityCalendarEntry[],
  date: string
): DateAvailability {
  const parsedDate = parseIsoDate(date)
  if (!parsedDate) return { blockouts: [], recurring: [] }

  const blockouts = entries.filter((entry) =>
    entry.entry_type === "blockout" &&
    Boolean(entry.starts_on && entry.ends_on) &&
    entry.starts_on! <= date &&
    entry.ends_on! >= date
  )

  const recurring = entries.filter((entry) =>
    entry.entry_type === "recurring" &&
    Boolean(entry.weekdays?.includes(parsedDate.weekday))
  )

  return {
    blockouts,
    recurring: recurring.sort((a, b) =>
      (a.start_time ?? "").localeCompare(b.start_time ?? "")
    ),
  }
}
