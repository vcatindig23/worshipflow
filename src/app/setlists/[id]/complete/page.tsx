import type { Metadata } from "next"
import { Feedback } from "@/components/ui/feedback"
import { Input, Textarea } from "@/components/ui/form-controls"
import { PageContainer } from "@/components/ui/page"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import {
  completeService,
  reopenService,
} from "../completion-actions"

type CompleteServicePageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatCompletedAt(value: string | null, timeZone: string) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value))
}

export default async function CompleteServicePage({
  params,
  searchParams,
}: CompleteServicePageProps) {
  const { id } = await params
  const query = await searchParams
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  if (!["admin", "worship_leader"].includes(workspace.role)) {
    redirect(`/setlists/${id}`)
  }

  const supabase = await createClient()
  const { data: setlist, error } = await supabase
    .from("setlists")
    .select(
      "id, name, description, service_date, service_time, status, completed_at, attendance_count, actual_duration_minutes, after_service_notes"
    )
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (error) {
    redirect(`/setlists/${id}?error=setlist_load_failed`)
  }

  if (!setlist) {
    notFound()
  }

  const errorKey = getParam(query.error)
  const errors: Record<string, string> = {
    invalid_attendance: "Attendance must be a whole number between 0 and 1,000,000.",
    invalid_duration: "Actual duration must be between 1 and 1,440 minutes.",
    notes_too_long: "After-service notes are too long.",
    completion_failed: "The service completion could not be saved.",
  }

  const completedAt = formatCompletedAt(
    setlist.completed_at,
    workspace.organizationTimezone
  )

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href={`/setlists/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to Service Plan
      </Link>

      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <CheckCircle2 className="size-3.5" />
          After-Service Review
        </span>
        <h1 className="wf-page-title mt-3">
          {setlist.completed_at ? "Update Service History" : "Complete Service"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Record what happened during the service so your church can reference
          it later.
        </p>
      </div>

      {errorKey && errors[errorKey] ? (
        <Feedback tone="error" title="Service history could not be saved">
          {errors[errorKey]}
        </Feedback>
      ) : null}

      {completedAt ? (
        <Feedback tone="success" title="Service already completed">
          {completedAt}
        </Feedback>
      ) : null}

      <form
        action={completeService}
        className="wf-card p-6 sm:p-7"
      >
        <input type="hidden" name="setlistId" value={setlist.id} />

        <div className="space-y-5">
          <div>
            <label
              htmlFor="attendanceCount"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Attendance
            </label>
            <Input
              id="attendanceCount"
              name="attendanceCount"
              type="number"
              min={0}
              max={1000000}
              step={1}
              inputMode="numeric"
              defaultValue={setlist.attendance_count ?? ""}
              placeholder="Optional"
              className="h-12 px-4"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              Record the approximate number of people who attended.
            </p>
          </div>

          <div>
            <label
              htmlFor="actualDurationMinutes"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Actual service duration
            </label>
            <Input
              id="actualDurationMinutes"
              name="actualDurationMinutes"
              type="number"
              min={1}
              max={1440}
              step={1}
              inputMode="numeric"
              defaultValue={setlist.actual_duration_minutes ?? ""}
              placeholder="Optional, in minutes"
              className="h-12 px-4"
            />
          </div>

          <div>
            <label
              htmlFor="afterServiceNotes"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              After-service notes
            </label>
            <Textarea
              id="afterServiceNotes"
              name="afterServiceNotes"
              maxLength={3000}
              rows={8}
              defaultValue={setlist.after_service_notes ?? ""}
              placeholder="What went well? What should the team improve or follow up on next time?"
              className="min-h-40 resize-y px-4 py-3 leading-6"
            />
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            {setlist.completed_at ? "Save Service History" : "Mark Service Complete"}
          </button>
        </div>
      </form>

      {setlist.completed_at ? (
        <form
          action={reopenService}
          className="flex justify-end"
        >
          <input type="hidden" name="setlistId" value={setlist.id} />
          <button
            type="submit"
            className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)] hover:underline"
          >
            Reopen Service
          </button>
        </form>
      ) : null}
    </PageContainer>
  )
}


export const metadata: Metadata = { title: "Complete service" }
