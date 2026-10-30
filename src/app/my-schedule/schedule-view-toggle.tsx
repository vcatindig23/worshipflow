"use client"

import { Feedback } from "@/components/ui/feedback"
import { Input, Textarea } from "@/components/ui/form-controls"
import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
} from "lucide-react"
import {
  getAvailabilityForDate,
  getCalendarMonthCells,
  type AvailabilityCalendarEntry,
} from "@/lib/schedule-calendar"
import { getTeamPositionLabel } from "@/lib/team-positions"
import { createAvailabilityEntry } from "./availability-actions"

type ScheduleEntry = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
}

type Period = "upcoming" | "past" | "all"

type ScheduleViewToggleProps = {
  entries: ScheduleEntry[]
  availabilityEntries: AvailabilityCalendarEntry[]
  today: string
  initialSelectedDate: string
  initialView: "list" | "calendar"
  timeZone: string
  period: Period
  availabilityAvailable: boolean
  children: ReactNode
}

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(value))
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return "Date range not set"
  if (start === end) {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(parseDate(start))
  }

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
  return `${new Intl.DateTimeFormat("en-PH", options).format(parseDate(start))} – ${new Intl.DateTimeFormat("en-PH", options).format(parseDate(end))}`
}

function displayTime(value: string | null) {
  if (!value) return "Time not set"
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText ?? "0")
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value
  const suffix = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`
}

function statusLabel(status: ScheduleEntry["status"]) {
  if (status === "published") return "Published"
  if (status === "archived") return "Archived"
  return "Draft"
}

function availabilityTimeLabel(entry: AvailabilityCalendarEntry) {
  return `${displayTime(entry.start_time)} – ${displayTime(entry.end_time)}`
}

export default function ScheduleViewToggle({
  entries,
  availabilityEntries,
  today,
  initialSelectedDate,
  initialView,
  timeZone,
  period,
  availabilityAvailable,
  children,
}: ScheduleViewToggleProps) {
  const [view, setView] = useState<"list" | "calendar">(initialView)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDate(initialSelectedDate)
    return new Date(selected.getFullYear(), selected.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(initialSelectedDate)

  const servicesByDate = useMemo(() => {
    const grouped = new Map<string, ScheduleEntry[]>()
    for (const entry of entries) {
      if (!entry.service_date) continue
      const current = grouped.get(entry.service_date) ?? []
      current.push(entry)
      grouped.set(entry.service_date, current)
    }
    return grouped
  }, [entries])

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const cells = useMemo(
    () => getCalendarMonthCells(year, month),
    [year, month]
  )
  const selectedServices = servicesByDate.get(selectedDate) ?? []
  const selectedAvailability = getAvailabilityForDate(
    availabilityEntries,
    selectedDate
  )
  const monthServiceCount = entries.filter((entry) =>
    entry.service_date?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)
  ).length

  function changeMonth(offset: number) {
    const nextMonth = new Date(year, month + offset, 1)
    setVisibleMonth(nextMonth)
    setSelectedDate(isoDate(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
  }

  function goToToday() {
    const current = parseDate(today)
    setVisibleMonth(new Date(current.getFullYear(), current.getMonth(), 1))
    setSelectedDate(today)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Schedule view</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Browse your service dates and see how they line up with your availability.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1" role="group" aria-label="Schedule view">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "list" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}
          >
            <List className="size-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            aria-pressed={view === "calendar"}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "calendar" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}
          >
            <CalendarDays className="size-4" /> Calendar
          </button>
        </div>
      </div>

      {view === "list" ? children : (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-[var(--foreground)]">
                  {visibleMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {monthServiceCount} {monthServiceCount === 1 ? "service" : "services"} this month
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToToday}
                className="h-9 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </header>

          <div className="grid gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-[var(--muted)] sm:text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--brand)]" /> Service
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--danger)]" /> Time off
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[var(--success)]" /> Weekly hours
                </span>
              </div>

              <div className="grid grid-cols-7 border-x border-t border-[var(--border)] bg-[var(--surface)]">
                {weekdayLabels.map((label) => (
                  <div key={label} className="border-b border-r border-[var(--border)] px-0.5 py-2.5 text-center text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)] last:border-r-0 sm:py-3 sm:text-xs">
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-l border-[var(--border)]">
                {cells.map((date, index) => {
                  if (!date) {
                    return (
                      <div
                        key={`blank-${index}`}
                        aria-hidden="true"
                        className="min-h-24 border-b border-r border-[var(--border)] bg-[var(--surface)]/35 p-1 sm:min-h-28 sm:p-2"
                      />
                    )
                  }

                  const day = Number(date.slice(-2))
                  const dayServices = servicesByDate.get(date) ?? []
                  const dayAvailability = getAvailabilityForDate(availabilityEntries, date)
                  const isToday = date === today
                  const isSelected = date === selectedDate

                  return (
                    <div
                      key={date}
                      className={`min-h-24 border-b border-r border-[var(--border)] p-1 transition-colors sm:min-h-28 sm:p-2 ${isSelected ? "bg-[var(--brand-soft)]/60" : isToday ? "bg-[var(--surface)]" : "bg-[var(--card)]"}`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDate(date)}
                          aria-pressed={isSelected}
                          aria-label={`Show details for ${formatDate(date)}`}
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 sm:size-8 sm:text-xs ${isSelected ? "bg-[var(--brand)] text-white" : isToday ? "border border-[var(--brand)] text-[var(--brand)]" : "text-[var(--foreground)] hover:bg-[var(--surface)]"}`}
                        >
                          {day}
                        </button>
                        <div className="flex min-w-0 items-center gap-1">
                          {dayAvailability.blockouts.length > 0 ? (
                            <span title="Unavailable" aria-label="Unavailable" className="size-2 rounded-full bg-[var(--danger)]" />
                          ) : null}
                          {dayAvailability.recurring.length > 0 ? (
                            <span title="Weekly hours" aria-label="Weekly hours" className="size-2 rounded-full bg-[var(--success)]" />
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {dayServices.slice(0, 2).map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/setlists/${entry.id}`}
                            title={entry.name}
                            className="block truncate rounded-md border border-[var(--brand)]/20 bg-[var(--brand-soft)] px-1.5 py-1 text-[9px] font-semibold leading-3.5 text-[var(--foreground)] transition hover:border-[var(--brand)] sm:text-[11px] sm:leading-4"
                          >
                            {entry.service_time ? <span className="hidden sm:inline">{displayTime(entry.service_time)} </span> : null}
                            {entry.name}
                          </Link>
                        ))}
                        {dayServices.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className="px-1 text-left text-[9px] font-semibold text-[var(--brand)] hover:underline sm:text-[10px]"
                          >
                            +{dayServices.length - 2} more
                          </button>
                        ) : null}
                        {dayAvailability.blockouts.length > 0 ? (
                          <p className="truncate px-1 text-[9px] font-medium text-[var(--danger)] sm:text-[10px]">Time off</p>
                        ) : dayAvailability.recurring.length > 0 ? (
                          <p className="truncate px-1 text-[9px] font-medium text-[var(--success)] sm:text-[10px]">Usual hours</p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <aside className="wf-card min-w-0 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">Selected day</p>
                  <h4 className="mt-1 text-base font-semibold leading-6 text-[var(--foreground)]">
                    {formatDate(selectedDate)}
                  </h4>
                </div>
                {selectedDate === today ? (
                  <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)]">Today</span>
                ) : null}
              </div>

              <div className="mt-4 space-y-4">
                <section>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Services</h5>
                  {selectedServices.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {selectedServices.map((entry) => (
                        <Link
                          key={entry.id}
                          href={`/setlists/${entry.id}`}
                          className="block rounded-xl border border-[var(--border)] p-3 transition hover:border-[var(--brand)] hover:bg-[var(--surface)]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-[var(--foreground)]">{entry.name}</span>
                            <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-1 text-[9px] font-semibold text-[var(--muted)]">{statusLabel(entry.status)}</span>
                          </div>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                            <Clock3 className="size-3.5" /> {displayTime(entry.service_time)}
                          </p>
                          {entry.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{entry.description}</p> : null}
                          <span className="mt-2 block text-[11px] font-semibold text-[var(--brand)]">Open service plan</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 rounded-lg bg-[var(--surface)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">
                      No assigned services on this date.
                    </p>
                  )}
                </section>

                <section className="border-t border-[var(--border)] pt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Your availability</h5>
                  {!availabilityAvailable ? (
                    <div className="mt-2">
                      <Feedback tone="warning" title="Availability unavailable">
                        Your service schedule is still available.
                      </Feedback>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selectedAvailability.blockouts.map((entry) => (
                        <div key={entry.id} className="wf-card p-3">
                          <p className="text-xs font-semibold text-[var(--danger)]">{entry.title || "Unavailable"}</p>
                          <p className="mt-1 text-[11px] text-[var(--danger)]">{formatDateRange(entry.starts_on, entry.ends_on)}</p>
                          {entry.reason ? <p className="mt-1 text-[11px] leading-5 text-[var(--danger)]">{entry.reason}</p> : null}
                        </div>
                      ))}
                      {selectedAvailability.recurring.map((entry) => (
                        <div key={entry.id} className="wf-card p-3">
                          <p className="text-xs font-semibold text-[var(--success)]">{entry.title || "Usual weekly hours"}</p>
                          <p className="mt-1 text-[11px] text-[var(--success)]">{availabilityTimeLabel(entry)}</p>
                          <p className="mt-1 text-[10px] text-[var(--success)]">{entry.timezone || timeZone}</p>
                          {entry.reason ? <p className="mt-1 text-[11px] leading-5 text-[var(--success)]">{entry.reason}</p> : null}
                        </div>
                      ))}
                      {selectedAvailability.blockouts.length === 0 && selectedAvailability.recurring.length === 0 ? (
                        <p className="rounded-lg bg-[var(--surface)] px-3 py-3 text-xs leading-5 text-[var(--muted)]">
                          No time off or weekly hours recorded for this date.
                        </p>
                      ) : null}
                    </div>
                  )}
                </section>

                {availabilityAvailable && selectedAvailability.blockouts.length === 0 ? (
                  <details className="group border-t border-[var(--border)] pt-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]">
                      <span className="inline-flex items-center gap-2"><Plus className="size-3.5" /> Mark this day unavailable</span>
                      <ChevronRight className="size-4 transition group-open:rotate-90" />
                    </summary>
                    <form action={createAvailabilityEntry} className="mt-3 space-y-3 rounded-lg bg-[var(--surface)] p-3">
                      <input type="hidden" name="entryType" value="blockout" />
                      <input type="hidden" name="timezone" value={timeZone} />
                      <input type="hidden" name="startsOn" value={selectedDate} />
                      <input type="hidden" name="endsOn" value={selectedDate} />
                      <input type="hidden" name="calendarDate" value={selectedDate} />
                      <input type="hidden" name="calendarView" value="1" />
                      <input type="hidden" name="calendarPeriod" value={period} />
                      <div>
                        <label htmlFor="calendarBlockoutTitle" className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">Title (optional)</label>
                        <Input id="calendarBlockoutTitle" name="title" maxLength={120} placeholder="e.g. Personal commitment" className="h-9 text-xs" />
                      </div>
                      <div>
                        <label htmlFor="calendarBlockoutReason" className="mb-1.5 block text-xs font-medium text-[var(--foreground)]">Note (optional)</label>
                        <Textarea id="calendarBlockoutReason" name="reason" maxLength={500} rows={2} placeholder="Add a note for your team" className="min-h-[72px] py-2 text-xs" />
                      </div>
                      <button type="submit" className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]">
                        <Plus className="size-3.5" /> Save unavailable date
                      </button>
                    </form>
                  </details>
                ) : null}

                <Link
                  href="#availability"
                  className="inline-flex text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  Manage all availability settings
                </Link>
              </div>
            </aside>
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--muted)] sm:px-6 sm:text-xs">
            Calendar dates use {timeZone}. Select a day to review its services and availability; select a service to open its plan.
          </div>
        </section>
      )}
    </div>
  )
}
