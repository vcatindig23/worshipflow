import type { Metadata } from "next"
import { ProtectedForm } from "@/components/ui/protected-form"
import { Feedback } from "@/components/ui/feedback"
import { Input, Textarea } from "@/components/ui/form-controls"
import { PageContainer } from "@/components/ui/page"
import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { updateSetlist } from "../../actions"
import FormSubmitButton from "@/components/ui/form-submit-button"

type EditSetlistPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Setlist = {
  id: string
  name: string
  description: string | null
  service_notes: string | null
  announcements: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
}

export default async function EditSetlistPage({
  params,
  searchParams,
}: EditSetlistPageProps) {
  const { id } = await params
  const queryParams = await searchParams

  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  if (
    ![
      "admin",
      "worship_leader",
      "song_editor",
    ].includes(workspace.role)
  ) {
    redirect(`/setlists/${id}`)
  }

  const supabase = await createClient()
  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const { data: setlist, error } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .eq(
      "organization_id",
      workspace.organizationId
    )
    .maybeSingle()

  if (error) {
    redirect(
      `/setlists/${id}?error=setlist_load_failed`
    )
  }

  if (!setlist) {
    notFound()
  }

  const typedSetlist = {
    ...setlist,
    service_time: serviceTimeAvailable
      ? setlist.service_time
      : null,
  } as Setlist

  const errorKey =
    typeof queryParams.error === "string"
      ? queryParams.error
      : ""

  const errorMessages: Record<
    string,
    string
  > = {
    invalid_name:
      "Enter a setlist name between 1 and 200 characters.",
    invalid_date:
      "Enter a valid service date.",
    invalid_time:
      "Enter a valid service start time.",
    service_time_migration_missing:
      "Service start times require the pending Supabase migration. Apply it before setting a service time.",
    description_too_long:
      "The description is too long.",
    service_notes_too_long:
      "Service notes are too long.",
    announcements_too_long:
      "Announcements are too long.",
    update_failed:
      "The setlist could not be updated.",
  }

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href={`/setlists/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to Setlist
      </Link>

      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <CalendarDays className="size-3.5" />
          Setlist Settings
        </span>

        <h1 className="wf-page-title mt-3">
          Edit Setlist
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Update the service information for this worship plan.
        </p>
      </div>

      {errorKey && errorMessages[errorKey] ? (
        <Feedback tone="error" title="Setlist could not be updated">
          {errorMessages[errorKey]}
        </Feedback>
      ) : null}

      {!workspace.serviceTimeAvailable ? (
        <Feedback tone="warning" title="Service start times unavailable">
          Service start times will be available after the Supabase migration is applied.
        </Feedback>
      ) : null}

      <ProtectedForm
        action={updateSetlist}
        className="wf-card p-6 sm:p-7"
      >
        <input
          type="hidden"
          name="setlistId"
          value={typedSetlist.id}
        />

        <div className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Setlist name
            </label>

            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              defaultValue={typedSetlist.name}
              className="w-full px-4"
            />
          </div>

          <div>
            <label
              htmlFor="serviceDate"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Service date
            </label>

            <Input
              id="serviceDate"
              name="serviceDate"
              type="date"
              defaultValue={
                typedSetlist.service_date ??
                ""
              }
              className="w-full px-4"
            />
          </div>

          {workspace.serviceTimeAvailable ? (
            <div>
              <label
                htmlFor="serviceTime"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Service start time
              </label>

              <Input
                id="serviceTime"
                name="serviceTime"
                type="time"
                defaultValue={
                  typedSetlist.service_time?.slice(0, 5) ?? ""
                }
                className="w-full px-4"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Google Calendar uses a one-hour duration.
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Description
            </label>

            <Textarea
              id="description"
              name="description"
              maxLength={2000}
              rows={5}
              defaultValue={
                typedSetlist.description ??
                ""
              }
              className="w-full resize-y px-4 py-3 leading-6"
            />
          </div>

          <div>
            <label
              htmlFor="serviceNotes"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Service Notes
            </label>

            <Textarea
              id="serviceNotes"
              name="serviceNotes"
              maxLength={3000}
              rows={5}
              defaultValue={
                typedSetlist.service_notes ??
                ""
              }
              placeholder="Add preparation notes, transitions, reminders, or details for the worship team."
              className="w-full resize-y px-4 py-3 leading-6"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Notes for the worship team to review before the service.
            </p>
          </div>

          <div>
            <label
              htmlFor="announcements"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Service Announcements
            </label>

            <Textarea
              id="announcements"
              name="announcements"
              maxLength={3000}
              rows={5}
              defaultValue={
                typedSetlist.announcements ??
                ""
              }
              placeholder="Share important announcements, schedule changes, or reminders for this service."
              className="w-full resize-y px-4 py-3 leading-6"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              Announcements will be visible to members viewing this service plan.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end">
            <Link
              href={`/setlists/${id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Cancel
            </Link>

            <FormSubmitButton
              pendingText="Saving changes…"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Changes
            </FormSubmitButton>
          </div>
        </div>
      </ProtectedForm>
    </PageContainer>
  )
}

export const metadata: Metadata = { title: "Edit setlist" }
