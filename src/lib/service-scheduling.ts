export function isValidServiceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

export function isValidServiceTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function getCalendarDateRange(
  serviceDate: string,
  serviceTime: string | null
) {
  const compactDate = serviceDate.replace(/-/g, "")

  if (!serviceTime) {
    const [year, month, day] = serviceDate.split("-").map(Number)
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")

    return `${compactDate}/${nextDate}`
  }

  const [hour, minute] = serviceTime.split(":").map(Number)
  const startMinutes = hour * 60 + minute
  const endMinutes = startMinutes + 60
  const endDate = new Date(`${serviceDate}T00:00:00.000Z`)

  if (endMinutes >= 24 * 60) {
    endDate.setUTCDate(endDate.getUTCDate() + 1)
  }

  const endHour = Math.floor(endMinutes % (24 * 60) / 60)
  const endMinute = endMinutes % 60
  const formatTime = (hours: number, minutes: number) =>
    `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`

  return `${compactDate}T${formatTime(hour, minute)}/${endDate
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}T${formatTime(endHour, endMinute)}`
}

export function formatServiceTime(value: string | null) {
  if (!value) {
    return null
  }

  const [hour, minute] = value.split(":").map(Number)
  const date = new Date()
  date.setHours(hour, minute, 0, 0)

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
