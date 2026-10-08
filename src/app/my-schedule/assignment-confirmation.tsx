"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock3, XCircle } from "lucide-react"
import { respondToSetlistAssignment } from "./actions"

type AssignmentConfirmationProps = {
  assignmentId: string
  status: "pending" | "confirmed" | "declined"
  responseNote: string | null
  respondedAt: string | null
}

function formatResponseDate(
  value: string,
  timeZone?: string
) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone
      ? {
          timeZone,
        }
      : {}),
  }).format(date)
}

export default function AssignmentConfirmation({
  assignmentId,
  status,
  responseNote,
  respondedAt,
}: AssignmentConfirmationProps) {
  const [currentStatus, setCurrentStatus] =
    useState(status)

  const [currentResponseNote, setCurrentResponseNote] =
    useState(responseNote)

  const [currentRespondedAt, setCurrentRespondedAt] =
    useState(respondedAt)

  const [responseDate, setResponseDate] =
    useState<string | null>(null)

  const [isResponding, setIsResponding] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [showDeclineForm, setShowDeclineForm] =
    useState(false)

  const [declineNote, setDeclineNote] =
    useState("")

  useEffect(() => {
    if (!currentRespondedAt) {
      setResponseDate(null)
      return
    }

    const browserTimeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone

    setResponseDate(
      formatResponseDate(
        currentRespondedAt,
        browserTimeZone
      )
    )
  }, [currentRespondedAt])

  async function handleResponse(
    nextStatus: "confirmed" | "declined"
  ) {
    setIsResponding(true)
    setError(null)

    const note =
      nextStatus === "declined"
        ? declineNote.trim() || undefined
        : undefined

    const result =
      await respondToSetlistAssignment(
        assignmentId,
        nextStatus,
        note
      )

    if (!result.success) {
      setError(result.error)
      setIsResponding(false)
      return
    }

    setCurrentStatus(nextStatus)

    setCurrentResponseNote(
      nextStatus === "declined"
        ? declineNote.trim() || null
        : null
    )

    setCurrentRespondedAt(
      new Date().toISOString()
    )

    setShowDeclineForm(false)
    setDeclineNote("")
    setIsResponding(false)
  }

  if (currentStatus === "confirmed") {
    return (
      <div className="w-full shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800">
              Confirmed
            </p>

            {responseDate ? (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                {responseDate}
              </p>
            ) : null}

            {currentResponseNote ? (
              <p className="mt-2 text-xs leading-5 text-emerald-800">
                {currentResponseNote}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (currentStatus === "declined") {
    return (
      <div className="w-full shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <XCircle className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-rose-800">
              Declined
            </p>

            {responseDate ? (
              <p className="mt-0.5 text-[11px] text-rose-700">
                {responseDate}
              </p>
            ) : null}

            {currentResponseNote ? (
              <p className="mt-2 text-xs leading-5 text-rose-800">
                {currentResponseNote}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setCurrentStatus("pending")
                setError(null)
              }}
              className="mt-3 text-xs font-semibold text-rose-800 underline underline-offset-2 hover:no-underline"
            >
              Change response
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--muted)]">
          <Clock3 className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            Confirm your assignment
          </p>

          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Let the worship leader know whether you can serve.
          </p>

          {showDeclineForm ? (
            <div className="mt-3 space-y-2.5">
              <label
                htmlFor={`decline-note-${assignmentId}`}
                className="block text-xs font-medium text-[var(--foreground)]"
              >
                Reason
                <span className="font-normal text-[var(--muted)]">
                  {" "}
                  (optional)
                </span>
              </label>

              <textarea
                id={`decline-note-${assignmentId}`}
                value={declineNote}
                onChange={(event) =>
                  setDeclineNote(
                    event.target.value.slice(0, 500)
                  )
                }
                maxLength={500}
                rows={3}
                placeholder="Add a short note for the worship leader."
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-[var(--muted)]">
                  {declineNote.length}/500
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeclineForm(false)
                      setDeclineNote("")
                      setError(null)
                    }}
                    disabled={isResponding}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleResponse("declined")
                    }
                    disabled={isResponding}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isResponding
                      ? "Saving..."
                      : "Decline assignment"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleResponse("confirmed")
                }
                disabled={isResponding}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResponding
                  ? "Saving..."
                  : "Confirm"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeclineForm(true)
                  setError(null)
                }}
                disabled={isResponding}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          )}

          {error ? (
            <p className="mt-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}