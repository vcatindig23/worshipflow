"use client"

import { useState, useTransition } from "react"
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
  timeZone: string
}

function formatResponseDate(
  value: string | null,
  timeZone: string
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
    timeZone,
  }).format(date)
}

export default function AssignmentConfirmation({
  assignmentId,
  status,
  responseNote,
  respondedAt,
  timeZone,
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

  const responseDate = currentRespondedAt
    ? formatResponseDate(
        currentRespondedAt,
        timeZone
      )
    : null


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
      <div
        role="status"
        className="wf-feedback wf-feedback-success w-full shrink-0 sm:w-[260px]"
      >
        <div className="wf-icon-tile wf-icon-tile-success flex size-7 items-center justify-center rounded-full">
          <Check className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Confirmed</p>
          {responseDate ? (
            <p className="mt-0.5 text-[11px]">{responseDate}</p>
          ) : null}
        </div>
      </div>
    )
  }

  if (
    currentStatus === "declined"
  ) {
    return (
      <div
        role="status"
        className="wf-feedback wf-feedback-error w-full shrink-0 sm:w-[280px]"
      >
        <div className="wf-icon-tile wf-icon-tile-danger flex size-7 items-center justify-center rounded-full">
          <X className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Declined</p>
          {responseDate ? (
            <p className="mt-0.5 text-[11px]">{responseDate}</p>
          ) : null}
          {currentResponseNote ? (
            <div className="mt-3 rounded-lg border border-[var(--danger)]/20 bg-[var(--card)]/70 px-3 py-2">
              <div className="flex items-start gap-2">
                <MessageSquareText className="mt-0.5 size-3.5 shrink-0" />
                <p className="text-xs leading-5">{currentResponseNote}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full shrink-0 sm:w-[300px]">
      <div className="wf-feedback wf-feedback-warning rounded-xl px-4 py-3">
        <div className="wf-icon-tile wf-icon-tile-warning flex size-7 items-center justify-center rounded-full">
          <Clock3 className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">Pending confirmation</p>
          <p className="mt-0.5 text-[11px]">
            Please confirm your assignment.
          </p>
        </div>
      </div>

        {!showDeclineForm ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs leading-5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
              />

              <p className="mt-1 text-right text-[10px] text-[var(--muted)]">
                {declineNote.length}/500
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setShowDeclineForm(false)
                  setDeclineNote("")
                  setError("")
                }}
                disabled={isPending}
                className="min-h-10 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDecline}
                disabled={isPending}
                className="min-h-10 flex-1 rounded-lg bg-[var(--danger-action)] px-3 py-2 text-xs font-semibold text-[var(--danger-foreground)] transition hover:bg-[var(--danger-action-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending
                  ? "Saving..."
                  : "Confirm decline"}
              </button>
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] px-3 py-2 text-[11px] leading-5 text-[var(--danger)]">
            {error}
          </p>
        ) : null}
    </div>
  )
}
