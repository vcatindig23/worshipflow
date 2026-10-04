import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { redirect } from "next/navigation"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createSetlist } from "../actions"

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
    description_too_long:
      "The description is too long.",
    create_failed:
      "The setlist could not be created.",
  }

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-6 py-8">
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

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Create a Setlist
        </h1>

        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Start with the service information. You can add songs and
          arrangement details after creating the setlist.
        </p>
      </div>

      {error && errorMessages[error] ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[error]}
        </div>
      ) : null}

      <form
        action={createSetlist}
        className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Setlist name
            </label>

            <input
              id="name"
              name="name"
              required
              maxLength={200}
              placeholder="Sunday Worship — October 11"
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </div>

          <div>
            <label
              htmlFor="serviceDate"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Service date
            </label>

            <input
              id="serviceDate"
              name="serviceDate"
              type="date"
              className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[var(--foreground)]"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              maxLength={2000}
              rows={5}
              placeholder="Optional notes about this service, theme, or special arrangements."
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </div>

          <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end">
            <Link
              href="/setlists"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Create Setlist
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}