import { Feedback } from "@/components/ui/feedback"
import { ProtectedForm } from "@/components/ui/protected-form"
import { Input, Textarea } from "@/components/ui/form-controls"
import { PageContainer } from "@/components/ui/page"
import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { redirect } from "next/navigation"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createSetlist } from "../actions"
import FormSubmitButton from "@/components/ui/form-submit-button"

type NewSetlistPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

export default async function NewSetlistPage({
  searchParams,
}: NewSetlistPageProps) {
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
    redirect("/setlists")
  }

  const params = await searchParams
  const error =
    typeof params.error === "string"
      ? params.error
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
    create_failed:
      "The setlist could not be created.",
  }

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href="/setlists"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Back to Setlists
      </Link>

      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <CalendarDays className="size-3.5" />
          New Service Plan
        </span>

        <h1 className="wf-page-title mt-3">
          Create a Setlist
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Start with the service information. You can add songs and
          arrangement details after creating the setlist.
        </p>
      </div>

      {error && errorMessages[error] ? (
        <Feedback tone="error" title="Could not create setlist">
          {errorMessages[error]}
        </Feedback>
      ) : null}

      {!workspace.serviceTimeAvailable ? (
        <Feedback tone="warning" title="Service start times unavailable">
          Service start times will be available after the Supabase migration is applied.
        </Feedback>
      ) : null}

      <ProtectedForm
        action={createSetlist}
        className="wf-card p-6 sm:p-7"
      >
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
              placeholder="Sunday Worship — October 11"
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
                defaultValue={workspace.defaultServiceTime.slice(0, 5)}
                className="w-full px-4"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Prefilled from your church&apos;s default service time. Google Calendar uses a one-hour duration.
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
              placeholder="Optional notes about this service, theme, or special arrangements."
              className="w-full resize-y px-4 py-3 leading-6"
            />
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end">
            <Link
              href="/setlists"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Cancel
            </Link>

            <FormSubmitButton
              pendingText="Creating setlist…"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Setlist
            </FormSubmitButton>
          </div>
        </div>
      </ProtectedForm>
    </PageContainer>
  )
}