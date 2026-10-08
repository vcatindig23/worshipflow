"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Check,
  Clock3,
  MessageSquareText,
  X,
} from "lucide-react"
import { respondToSetlistAssignment } from "./actions"

type ConfirmationStatus =
  | "pending"
  | "confirmed"
  | "declined"

type AssignmentConfirmationProps = {
  assignmentId: string
  status: ConfirmationStatus
  responseNote: string | null
  respondedAt: string | null
}

function formatResponseDate(
  value: string | null,
  timeZone?: string
) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
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
  const [
    currentStatus,
    setCurrentStatus,
  ] = useState<ConfirmationStatus>(status)

  const [
    currentResponseNote,
    setCurrentResponseNote,
  ] = useState(responseNote)

  const [
    currentRespondedAt,
    setCurrentRespondedAt,
  ] = useState(respondedAt)

  const [
    showDeclineForm,
    setShowDeclineForm,
  ] = useState(false)

  const [
    declineNote,
    setDeclineNote,
  ] = useState("")

  const [
    error,
    setError,
  ] = useState("")

  const [
    isPending,
    startTransition,
  ] = useTransition()

  const [
    responseDate,
    setResponseDate,
  ] = useState<string | null>(null)

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

  function handleConfirm() {
    setError("")

    startTransition(async () => {
      const result =
        await respondToSetlistAssignment(
          assignmentId,
          "confirmed"
        )

      if (!result.success) {
        setError(result.error)
        return
      }

      setCurrentStatus("confirmed")
      setCurrentResponseNote(null)
      setCurrentRespondedAt(
        new Date().toISOString()
      )
      setShowDeclineForm(false)
      setDeclineNote("")
    })
  }

  function handleDecline() {
    setError("")

    startTransition(async () => {
      const result =
        await respondToSetlistAssignment(
          assignmentId,
          "declined",
          declineNote
        )

      if (!result.success) {
        setError(result.error)
        return
      }

      setCurrentStatus("declined")
      setCurrentResponseNote(
        declineNote.trim() || null
      )
      setCurrentRespondedAt(
        new Date().toISOString()
      )
      setShowDeclineForm(false)
    })
  }

  if (
    currentStatus === "confirmed"
  ) {
    return (
      <div className="w-full shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:w-[260px]">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="size-4" />
          </div>

          <div>
            <p className="text-xs font-semibold text-emerald-800">
              Confirmed
            </p>

            {currentRespondedAt ? (
              <p className="mt-0.5 text-[11px] text-emerald-700">
                {responseDate}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (
    currentStatus === "declined"
  ) {
    return (
      <div className="w-full shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 sm:w-[280px]">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <X className="size-4" />
          </div>

          <div>
            <p className="text-xs font-semibold text-rose-800">
              Declined
            </p>

            {currentRespondedAt ? (
              <p className="mt-0.5 text-[11px] text-rose-700">
                {formatResponseDate(
                  currentRespondedAt
                )}
              </p>
            ) : null}
          </div>
        </div>

        {currentResponseNote ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-white/70 px-3 py-2">
            <div className="flex items-start gap-2">
              <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
              <p className="text-xs leading-5 text-rose-800">
                {currentResponseNote}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full shrink-0 sm:w-[300px]">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Clock3 className="size-4" />
          </div>

          <div>
            <p className="text-xs font-semibold text-amber-800">
              Pending confirmation
            </p>

            <p className="mt-0.5 text-[11px] text-amber-700">
              Please confirm your assignment.
            </p>
          </div>
        </div>

        {!showDeclineForm ? (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="size-3.5" />
              {isPending
                ? "Saving..."
                : "Confirm"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("")
                setShowDeclineForm(true)
              }}
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="size-3.5" />
              Decline
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor={`decline-note-${assignmentId}`}
                className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]"
              >
                Reason
                <span className="ml-1 font-normal text-[var(--muted)]">
                  (optional)
                </span>
              </label>

              <textarea
                id={`decline-note-${assignmentId}`}
                value={declineNote}
                onChange={(event) =>
                  setDeclineNote(
                    event.target.value
                  )
                }
                maxLength={500}
                rows={3}
                placeholder="Let the worship leader know why you cannot serve."
                disabled={isPending}
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs leading-5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
              />

              <p className="mt-1 text-right text-[10px] text-[var(--muted)]">
                {declineNote.length}/500
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeclineForm(false)
                  setDeclineNote("")
                  setError("")
                }}
                disabled={isPending}
                className="flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDecline}
                disabled={isPending}
                className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? "Saving..."
                  : "Confirm decline"}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[11px] leading-5 text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}