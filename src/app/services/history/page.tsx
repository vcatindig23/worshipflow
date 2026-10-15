import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { toSearchPattern } from "@/lib/global-search"

type CompletedService = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
  completed_at: string
  attendance_count: number | null
  actual_duration_minutes: number | null
  after_service_notes: string | null
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not set"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function formatCompletedAt(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value))
}

function formatDuration(minutes: number | null) {
  if (!minutes) {
    return "Not recorded"
  }

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60

  return hours > 0
    ? `${hours}h ${remainder ? `${remainder}m` : ""}`.trim()
    : `${minutes} min`
}

type ServicesHistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type HistoryPeriod = "all" | "90days" | "12months"
const PAGE_SIZE = 20

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function historyHref(query: string, period: HistoryPeriod, page: number) {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (period !== "all") params.set("period", period)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? "/services/history?" + search : "/services/history"
}

export default async function ServicesHistoryPage({
  searchParams,
}: ServicesHistoryPageProps) {
  const [params, workspace] = await Promise.all([
    searchParams,
    getWorkspace(),
  ])
  if (!workspace) {
    redirect("/onboarding")
  }

  // Exclude PostgREST logic separators from user input before constructing
  // the OR expression. SQL LIKE metacharacters are escaped by toSearchPattern.
  const query = (getParam(params.q) ?? "")
    .replace(/[(),\\'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
  const requestedPeriod = getParam(params.period)
  const period: HistoryPeriod =
    requestedPeriod === "90days" || requestedPeriod === "12months"
      ? requestedPeriod
      : "all"
  const requestedPage = Number.parseInt(getParam(params.page) ?? "1", 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1

  const supabase = await createClient()
  let historyQuery = supabase
    .from("setlists")
    .select(
      "id, name, description, service_date, service_time, status, completed_at, attendance_count, actual_duration_minutes, after_service_notes",
      { count: "exact" }
    )
    .eq("organization_id", workspace.organizationId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  if (query) {
    const pattern = toSearchPattern(query)
    historyQuery = historyQuery.or(
      "name.ilike." + pattern +
      ",description.ilike." + pattern +
      ",after_service_notes.ilike." + pattern
    )
  }

  if (period === "90days" || period === "12months") {
    const cutoff = new Date()
    if (period === "90days") {
      cutoff.setDate(cutoff.getDate() - 90)
    } else {
      cutoff.setMonth(cutoff.getMonth() - 12)
    }
    historyQuery = historyQuery.gte("completed_at", cutoff.toISOString())
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, error, count } = await historyQuery.range(
    from,
    from + PAGE_SIZE - 1
  )

  if (error) {
    console.error("load_service_history failed:", {
      code: error.code,
      message: error.message,
    })
    redirect("/error?code=setlists_load_failed")
  }

  const totalServices = count ?? 0
  const totalPages = Math.ceil(totalServices / PAGE_SIZE)
  if (totalPages > 0 && page > totalPages) {
    redirect(historyHref(query, period, totalPages))
  }

  const services = (data ?? []) as CompletedService[]
  const attendanceValues = services
    .map((service) => service.attendance_count)
    .filter((value): value is number => value !== null)
  const durationValues = services
    .map((service) => service.actual_duration_minutes)
    .filter((value): value is number => value !== null)

  const averageAttendance =
    attendanceValues.length > 0
      ? Math.round(
          attendanceValues.reduce((sum, value) => sum + value, 0) /
            attendanceValues.length
        )
      : null

  const averageDuration =
    durationValues.length > 0
      ? Math.round(
          durationValues.reduce((sum, value) => sum + value, 0) /
            durationValues.length
        )
      : null

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
              <History className="size-3.5" />
              Service History
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
              After-Service History
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Review completed services, attendance, actual duration, and notes
              for future planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/services/insights"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Service Insights
            </Link>
            <Link
              href="/services"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              Back to Services
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <form
          action="/services/history"
          method="get"
          role="search"
          className="flex flex-col gap-3 lg:flex-row"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search completed services</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              name="q"
              value={query}
              maxLength={100}
              placeholder="Search service names, descriptions, or after-service notes..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </label>

          <label>
            <span className="sr-only">Filter history by completion date</span>
            <select
              name="period"
              defaultValue={period}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)] sm:w-44"
            >
              <option value="all">All time</option>
              <option value="90days">Past 90 days</option>
              <option value="12months">Past 12 months</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            <SlidersHorizontal className="size-4" />
            Apply filters
          </button>

          {query || period !== "all" ? (
            <Link
              href="/services/history"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <CheckCircle2 className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Matching completed services
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
            {totalServices.toLocaleString("en-PH")}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Users className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Average attendance (this page)
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
            {averageAttendance === null
              ? "—"
              : averageAttendance.toLocaleString("en-PH")}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Clock3 className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Average duration (this page)
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
            {averageDuration === null
              ? "—"
              : formatDuration(averageDuration)}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--foreground)]" aria-live="polite">
            {totalServices === 0
              ? "No matching services"
              : "Showing " + (from + 1) + "–" +
                Math.min(from + services.length, totalServices) + " of " +
                totalServices.toLocaleString("en-PH") + " completed services"}
          </p>
          {totalServices > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Page {page} of {totalPages}
            </p>
          ) : null}
        </div>

        {services.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <History className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              {query || period !== "all"
                ? "No services match these filters"
                : "No completed services yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {query || period !== "all"
                ? "Try a different search term or date range, or clear your filters."
                : "Complete a service after worship to start building your church's history."}
            </p>
            {query || period !== "all" ? (
              <Link
                href="/services/history"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
              >
                Clear filters
              </Link>
            ) : (
              <Link
                href="/services"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
              >
                View Services
                <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/setlists/${service.id}`}
                className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                        {service.name}
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                        Completed
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {formatDate(service.service_date)}
                      </span>
                      {service.completed_at
                        ? ` · Completed ${formatCompletedAt(
                            service.completed_at,
                            workspace.organizationTimezone
                          )}`
                        : ""}
                    </p>

                    {service.description ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {service.description}
                      </p>
                    ) : null}
                  </div>

                  <ArrowRight className="size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    {service.attendance_count === null
                      ? "Attendance not recorded"
                      : `${service.attendance_count.toLocaleString(
                          "en-PH"
                        )} attended`}
                  </span>
                  <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    {formatDuration(service.actual_duration_minutes)}
                  </span>
                </div>

                {service.after_service_notes ? (
                  <div className="mt-3 rounded-xl bg-[var(--surface)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      After-service notes
                    </p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                      {service.after_service_notes}
                    </p>
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label="Service history pagination"
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <p className="text-xs text-[var(--muted)]">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={historyHref(query, period, page - 1)}
                  rel="prev"
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                >
                  <ArrowLeft className="size-4" />
                  Previous
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center rounded-lg bg-[var(--surface)] px-3 text-sm text-[var(--muted)]">
                  First page
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={historyHref(query, period, page + 1)}
                  rel="next"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--brand)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Next
                  <ArrowRight className="size-4" />
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  )
}
