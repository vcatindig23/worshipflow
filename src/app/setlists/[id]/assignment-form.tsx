"use client"

import { useState } from "react"
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react"
import { addSetlistTeamAssignment } from "../actions"

type ProposedConflict = {
  serviceName: string
  kind: "Service" | "Rehearsal"
  date: string
  startTime: string
  endTime: string
  isCurrentService: boolean
}

type AssignmentOption = {
  key: string
  label: string
  conflicts: ProposedConflict[]
}

type AssignmentFormProps = {
  setlistId: string
  options: AssignmentOption[]
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function formatTime(value: string) {
  const [hourText, minuteText] = value.split(":")
  const hour = Number(hourText)
  const minute = Number(minuteText ?? "0")
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return value

  const suffix = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`
}

export default function AssignmentForm({
  setlistId,
  options,
}: AssignmentFormProps) {
  const [selectedKey, setSelectedKey] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const selectedOption = options.find((option) => option.key === selectedKey)
  const conflicts = selectedOption?.conflicts ?? []
  const hasConflicts = conflicts.length > 0

  return (
    <form
      action={addSetlistTeamAssignment}
      className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"
    >
      <input type="hidden" name="setlistId" value={setlistId} />
      <label
        htmlFor="assignmentKey"
        className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
      >
        Member and position
      </label>
      <select
        id="assignmentKey"
        name="assignmentKey"
        required
        value={selectedKey}
        onChange={(event) => {
          setSelectedKey(event.target.value)
          setAcknowledged(false)
        }}
        className="wf-input h-11 px-3"
      >
        <option value="" disabled>
          Select a team member
        </option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
            {option.conflicts.length > 0 ? " · Schedule overlap" : ""}
          </option>
        ))}
      </select>

      {hasConflicts ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-3.5"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Schedule overlap detected
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                This member already has a service or rehearsal at an overlapping time.
                Review the commitment before continuing.
              </p>
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {conflicts.map((conflict, index) => (
              <li
                key={`${conflict.kind}-${conflict.date}-${conflict.startTime}-${index}`}
                className="rounded-lg border border-[var(--warning)]/20 bg-[var(--card)]/70 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {conflict.isCurrentService
                    ? `Rehearsal for ${conflict.serviceName}`
                    : `${conflict.kind}: ${conflict.serviceName}`}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {formatDate(conflict.date)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" />
                    {formatTime(conflict.startTime)}–{formatTime(conflict.endTime)}
                  </span>
                </p>
              </li>
            ))}
          </ul>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[var(--foreground)]">
            <input
              type="checkbox"
              name="acknowledgeScheduleConflict"
              value="true"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
            />
            <span>
              I reviewed these overlapping commitments and still want to assign this member.
            </span>
          </label>
        </div>
      ) : selectedOption ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--success)]">
          <CheckCircle2 className="size-3.5" />
          No overlapping service or rehearsal was found for this member.
        </p>
      ) : (
        <p className="text-xs leading-5 text-[var(--muted)]">
          Select a member to check their existing service and rehearsal schedule before assigning.
        </p>
      )}

      <button
        type="submit"
        disabled={!selectedKey || (hasConflicts && !acknowledged)}
        className="h-10 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hasConflicts ? "Assign with acknowledged overlap" : "Assign to Service"}
      </button>
    </form>
  )
}
