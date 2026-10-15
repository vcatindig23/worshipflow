"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react"

type ScheduleEntry = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
}

type ScheduleViewToggleProps = {
  entries: ScheduleEntry[]
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

function displayTime(value: string | null) {
  if (!value) return ""
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  if (!Number.isFinite(hour)) return value
  const suffix = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${minuteText ?? "00"} ${suffix}`
}

export default function ScheduleViewToggle({ entries, children }: ScheduleViewToggleProps) {
  const [view, setView] = useState<"list" | "calendar">("list")
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

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
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Schedule view</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Switch between your service list and a monthly calendar.</p>
        </div>
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] p-1" role="group" aria-label="Schedule view">
          <button type="button" onClick={() => setView("list")} aria-pressed={view === "list"} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "list" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}>
            <List className="size-4" /> List
          </button>
          <button type="button" onClick={() => setView("calendar")} aria-pressed={view === "calendar"} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${view === "calendar" ? "bg-[var(--brand)] text-white" : "text-[var(--muted)] hover:bg-[var(--surface)]"}`}>
            <CalendarDays className="size-4" /> Calendar
          </button>
        </div>
      </div>

      {view === "list" ? children : (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface)]">
              <ChevronLeft className="size-4" />
            </button>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {visibleMonth.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
            </h3>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface)]">
              <ChevronRight className="size-4" />
            </button>
          </header>

          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface)]">
            {weekdayLabels.map((label) => <div key={label} className="px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] sm:text-xs">{label}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, index) => {
              if (day === null) return <div key={`blank-${index}`} className="min-h-20 border-b border-r border-[var(--border)] bg-[var(--surface)]/40 p-1 sm:min-h-28 sm:p-2" />
              const key = isoDate(year, month, day)
              const dayEntries = servicesByDate.get(key) ?? []
              const today = new Date()
              const isToday = key === isoDate(today.getFullYear(), today.getMonth(), today.getDate())
              return (
                <div key={key} className={`min-h-20 border-b border-r border-[var(--border)] p-1 sm:min-h-28 sm:p-2 ${isToday ? "bg-[var(--brand-soft)]/50" : ""}`}>
                  <div className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-[var(--brand)] text-white" : "text-[var(--foreground)]"}`}>{day}</div>
                  <div className="space-y-1">
                    {dayEntries.slice(0, 3).map((entry) => (
                      <Link key={entry.id} href={`/setlists/${entry.id}`} title={entry.name} className="block truncate rounded-md border border-[var(--brand)]/15 bg-[var(--brand-soft)] px-1.5 py-1 text-[10px] font-semibold leading-4 text-[var(--foreground)] transition hover:border-[var(--brand)] sm:text-xs">
                        {entry.service_time ? <span className="hidden sm:inline">{displayTime(entry.service_time)} </span> : null}{entry.name}
                      </Link>
                    ))}
                    {dayEntries.length > 3 ? <p className="px-1 text-[10px] text-[var(--muted)]">+{dayEntries.length - 3} more</p> : null}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] sm:px-6">
            Select a service to open its setlist. Availability responses and the existing assignment tools remain in List view.
          </div>
        </section>
      )}
    </div>
  )
}
