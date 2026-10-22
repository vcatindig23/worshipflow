"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Check, ClipboardCheck, MessageSquare, Send } from "lucide-react"
import { postSongReviewComment, setSongReviewStatus } from "@/app/songs/[id]/review-actions"

export type SongReviewComment = {
  id: string
  user_id: string
  author_name: string
  body: string
  created_at: string
}

type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved"

type SongReviewPanelProps = {
  songId: string
  canEdit: boolean
  initialStatus: ReviewStatus
  comments: SongReviewComment[]
}

const statusLabels: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
}

const statusStyles: Record<ReviewStatus, string> = {
  draft: "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
  in_review: "border-sky-200 bg-sky-50 text-sky-800",
  changes_requested: "border-amber-200 bg-amber-50 text-amber-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function SongReviewPanel({ songId, canEdit, initialStatus, comments }: SongReviewPanelProps) {
  const router = useRouter()
  const [status, setStatus] = useState<ReviewStatus>(initialStatus)
  const [body, setBody] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    startTransition(async () => {
      const result = await postSongReviewComment(songId, body)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setBody("")
      setMessage("Comment added.")
      router.refresh()
    })
  }

  function saveStatus() {
    setMessage("")
    startTransition(async () => {
      const result = await setSongReviewStatus(songId, status)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setMessage("Review status updated.")
      router.refresh()
    })
  }

  function requestReview() {
    setMessage("")
    startTransition(async () => {
      const result = await setSongReviewStatus(songId, "in_review")
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setStatus("in_review")
      setMessage("Review requested.")
      router.refresh()
    })
  }

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="song-review-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <MessageSquare className="size-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Collaboration</p>
          </div>
          <h2 id="song-review-heading" className="mt-2 text-lg font-semibold text-[var(--foreground)]">Song review</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Discuss arrangement changes and move the chart through review.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyles[initialStatus]}`}>
          {initialStatus === "approved" ? <Check className="size-3.5" aria-hidden="true" /> : <ClipboardCheck className="size-3.5" aria-hidden="true" />}
          {statusLabels[initialStatus]}
        </span>
      </div>

      {canEdit ? (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[var(--surface)] p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="song-review-status" className="mb-2 block text-xs font-semibold text-[var(--muted)]">Review status</label>
            <select id="song-review-status" value={status} onChange={(event) => setStatus(event.currentTarget.value as ReviewStatus)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40">
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <button type="button" onClick={saveStatus} disabled={pending || status === initialStatus} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50">
            <ClipboardCheck className="size-4" aria-hidden="true" />
            Save status
          </button>
        </div>
      ) : initialStatus === "draft" ? (
        <div className="mt-5 rounded-2xl bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--muted)]">Ready for a worship leader or song editor to review?</p>
          <button type="button" onClick={requestReview} disabled={pending} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] disabled:opacity-50">
            <Send className="size-4" aria-hidden="true" />
            Request review
          </button>
        </div>
      ) : null}

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Comments <span className="ml-1 text-[var(--muted)]">({comments.length})</span></h3>
        {comments.length ? (
          <ol className="mt-4 space-y-4">
            {comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]" aria-hidden="true">
                  {comment.author_name.trim().charAt(0).toUpperCase() || "T"}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-[var(--border)] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{comment.author_name}</p>
                    <time dateTime={comment.created_at} className="text-xs text-[var(--muted)]">{formatDate(comment.created_at)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">{comment.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">No comments yet. Use the thread to share a correction, chord change, or rehearsal suggestion.</p>
        )}
      </div>

      <form onSubmit={submitComment} className="mt-5">
        <label htmlFor="song-review-comment" className="mb-2 block text-xs font-semibold text-[var(--muted)]">Add a comment</label>
        <textarea id="song-review-comment" value={body} onChange={(event) => setBody(event.currentTarget.value)} maxLength={5000} rows={3} placeholder="Suggest a lyric correction, chord change, or rehearsal note..." className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15" />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">{body.length}/5,000 characters</p>
          <button type="submit" disabled={pending || !body.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="size-4" aria-hidden="true" />
            {pending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>

      {message ? <p role="status" aria-live="polite" className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  )
}
