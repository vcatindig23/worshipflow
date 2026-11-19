"use client"

import { useState } from "react"
import { CalendarDays, Check, Clock3, Pencil, Trash2, X } from "lucide-react"
import { Input, Textarea } from "@/components/ui/form-controls"
import {
  deleteAvailabilityEntry,
  updateAvailabilityEntry,
} from "./availability-actions"

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

type AvailabilityEntryCardProps = {
  entry: AvailabilityEntry
  organizationTimezone: string
  selectedDate: string
  calendarView: boolean
  period: "upcoming" | "past" | "all"
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDate(value: string | null) {
  if (!value) return "Date not set"
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function formatTime(value: string | null) {
  if (!value) return ""
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText ?? "0")
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2020, 0, 1, hour, minute)))
}

export default function AvailabilityEntryCard({
  entry,
  organizationTimezone,
  selectedDate,
  calendarView,
  period,
}: AvailabilityEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const isBlockout = entry.entry_type === "blockout"
  const title = entry.title || (isBlockout ? "Unavailable dates" : "Recurring availability")
  const weekdays = entry.weekdays ?? []

  return (
    <article className="wf-card space-y-3 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`wf-status ${isBlockout ? "wf-status-warning" : "wf-status-success"}`}>
            {isBlockout ? "Unavailable" : "Weekly availability"}
          </span>
          <h4 className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {title}
          </h4>
          <p className="mt-1 inline-flex items-start gap-1.5 text-xs leading-5 text-[var(--muted)]">
            {isBlockout ? <CalendarDays className="mt-0.5 size-3.5 shrink-0" /> : <Clock3 className="mt-0.5 size-3.5 shrink-0" />}
            {isBlockout
              ? `${formatDate(entry.starts_on)} – ${formatDate(entry.ends_on)}`
              : `${weekdays.slice().sort((a, b) => a - b).map((day) => weekdayLabels[day]).join(", ")} · ${formatTime(entry.start_time)}–${formatTime(entry.end_time)}`}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--muted)]">
            Time zone: {entry.timezone || organizationTimezone}
          </p>
          {entry.reason ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">
              {entry.reason}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            aria-expanded={isEditing}
            aria-label={isEditing ? `Close editor for ${title}` : `Edit ${title}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            {isEditing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
            {isEditing ? "Close" : "Edit"}
          </button>
          <form action={deleteAvailabilityEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              aria-label={`Delete ${title}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {isEditing ? (
        <form action={updateAvailabilityEntry} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-3">
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="entryType" value={entry.entry_type} />
          <input type="hidden" name="timezone" value={entry.timezone || organizationTimezone} />
          <input type="hidden" name="calendarView" value={calendarView ? "1" : "0"} />
          <input type="hidden" name="calendarDate" value={selectedDate} />
          <input type="hidden" name="calendarPeriod" value={period} />

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Title (optional)
            <Input
              name="title"
              maxLength={120}
              defaultValue={entry.title ?? ""}
              placeholder={isBlockout ? "e.g. Family trip" : "e.g. Weekday evenings"}
              className="mt-1.5 h-10 bg-[var(--card)]"
            />
          </label>

          {isBlockout ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                Start date
                <Input
                  type="date"
                  name="startsOn"
                  required
                  defaultValue={entry.starts_on ?? ""}
                  className="mt-1.5 h-10 bg-[var(--card)]"
                />
              </label>
              <label className="block text-xs font-semibold text-[var(--foreground)]">
                End date
                <Input
                  type="date"
                  name="endsOn"
                  required
                  defaultValue={entry.ends_on ?? ""}
                  className="mt-1.5 h-10 bg-[var(--card)]"
                />
              </label>
            </div>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-[var(--foreground)]">
                  Days of the week
                </legend>
                <div className="flex flex-wrap gap-2">
                  {weekdayLabels.map((day, index) => (
                    <label
                      key={day}
                      className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--foreground)]"
                    >
                      <input
                        type="checkbox"
                        name="weekdays"
                        value={index}
                        defaultChecked={weekdays.includes(index)}
                        className="size-3.5 accent-[var(--brand)]"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  Available from
                  <Input
                    type="time"
                    name="startTime"
                    required
                    defaultValue={entry.start_time?.slice(0, 5) ?? ""}
                    className="mt-1.5 h-10 bg-[var(--card)]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[var(--foreground)]">
                  Available until
                  <Input
                    type="time"
                    name="endTime"
                    required
                    defaultValue={entry.end_time?.slice(0, 5) ?? ""}
                    className="mt-1.5 h-10 bg-[var(--card)]"
                  />
                </label>
              </div>
            </>
          )}

          <label className="block text-xs font-semibold text-[var(--foreground)]">
            Note (optional)
            <Textarea
              name="reason"
              maxLength={500}
              rows={2}
              defaultValue={entry.reason ?? ""}
              placeholder="Add context for your team"
              className="mt-1.5 min-h-20 bg-[var(--card)] py-2"
            />
          </label>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--card)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <Check className="size-4" />
              Save changes
            </button>
          </div>
        </form>
      ) : null}
    </article>
  )
}
