import Link from "next/link"
import { CalendarDays, Clock3, Plus, Trash2 } from "lucide-react"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { requireWorkspaceAuthorization } from "@/lib/authorization"
import { createAvailabilityEntry, deleteAvailabilityEntry } from "./actions"

export const metadata = {
  title: "My Availability | WorshipFlow",
  description: "Manage your recurring availability and dates you cannot serve.",
}

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
  is_active: boolean
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatTime(value: string | null) {
  if (!value) return ""
  const [hour, minute] = value.split(":").map(Number)
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export default async function MyAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>
}) {
  const { supabase, userId, organizationId } = await requireWorkspaceAuthorization()
  const [{ data, error }, params] = await Promise.all([
    supabase
      .from("member_availability")
      .select("id, entry_type, title, reason, starts_on, ends_on, weekdays, start_time, end_time, is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    searchParams,
  ])

  if (error) throw new Error("Unable to load your availability.")
  const entries = (data ?? []) as AvailabilityEntry[]

  return (
    <PageContainer>
      <PageHeader
        title={<>My Availability</>}
        eyebrow={<><CalendarDays className="size-3.5" /> Team coordination</>}
        description={<>Tell your worship team when you can serve and when you need to be unavailable.</>}
        actions={<Link href="/my-schedule" className="text-sm font-semibold text-[var(--brand)] hover:underline">My schedule →</Link>}
      />

      {params.saved ? (
        <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Availability updated.</p>
      ) : null}
      {params.error ? (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {params.error === "invalid_entry" ? "Check the dates, days, and times and try again." : params.error === "delete_failed" ? "Could not remove this entry. Please try again." : "Could not save your availability. Please try again."}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Add availability</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Use a date blockout for leave or a recurring window for your usual weekly schedule.</p>
          <form action={createAvailabilityEntry} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Entry type
              <select name="entryType" defaultValue="blockout" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3">
                <option value="blockout">Unavailable dates / leave</option>
                <option value="recurring">Recurring weekly availability</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Title (optional)
              <input name="title" maxLength={120} placeholder="e.g. Family trip" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] px-3" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Start date (blockout)
                <input type="date" name="startsOn" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] px-3" />
              </label>
              <label className="block text-sm font-medium">End date (blockout)
                <input type="date" name="endsOn" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] px-3" />
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Recurring days</legend>
              <div className="flex flex-wrap gap-2">
                {weekdayLabels.map((day, index) => (
                  <label key={day} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs">
                    <input type="checkbox" name="weekdays" value={index} />
                    {day}
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)]">Only used for recurring weekly availability.</p>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">Available from
                <input type="time" name="startTime" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] px-3" />
              </label>
              <label className="block text-sm font-medium">Available until
                <input type="time" name="endTime" className="mt-1.5 h-11 w-full rounded-xl border border-[var(--border)] px-3" />
              </label>
            </div>
            <label className="block text-sm font-medium">Note (optional)
              <textarea name="reason" maxLength={500} rows={2} placeholder="Add context for your team" className="mt-1.5 w-full rounded-xl border border-[var(--border)] p-3" />
            </label>
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90">
              <Plus className="size-4" /> Save availability
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Your entries</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{entries.length} saved {entries.length === 1 ? "entry" : "entries"}</p>
          </div>
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-5 py-10 text-center">
              <Clock3 className="mx-auto size-6 text-[var(--muted)]" />
              <p className="mt-3 text-sm font-semibold">No availability entries yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Add your recurring schedule or upcoming leave.</p>
            </div>
          ) : entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand)]">{entry.entry_type === "blockout" ? "Unavailable" : "Weekly availability"}</span>
                  <h3 className="mt-1 font-semibold text-[var(--foreground)]">{entry.title || (entry.entry_type === "blockout" ? "Unavailable dates" : "Recurring availability")}</h3>
                </div>
                <form action={deleteAvailabilityEntry}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button type="submit" aria-label="Delete availability entry" className="rounded-lg p-2 text-[var(--muted)] hover:bg-rose-50 hover:text-rose-700">
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {entry.entry_type === "blockout"
                  ? `${entry.starts_on} – ${entry.ends_on}`
                  : `${(entry.weekdays ?? []).slice().sort((a, b) => a - b).map((day) => weekdayLabels[day]).join(", ")} · ${formatTime(entry.start_time)}–${formatTime(entry.end_time)}`}
              </p>
              {entry.reason ? <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{entry.reason}</p> : null}
            </article>
          ))}
        </section>
      </div>
    </PageContainer>
  )
}
