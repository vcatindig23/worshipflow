import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

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

export default async function ServicesHistoryPage() {
  const workspace = await getWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("setlists")
    .select(
      "id, name, description, service_date, service_time, status, completed_at, attendance_count, actual_duration_minutes, after_service_notes"
    )
    .eq("organization_id", workspace.organizationId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(100)

  if (error) {
    redirect("/error?code=setlists_load_failed")
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

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <CheckCircle2 className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Completed services
            </p>
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--foreground)]">
            {services.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--brand)]">
            <Users className="size-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Average attendance
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
              Average duration
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
        {services.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <History className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              No completed services yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Complete a service after worship to start building your church&apos;s
              history.
            </p>
            <Link
              href="/services"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              View Services
              <ArrowRight className="size-4" />
            </Link>
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
      </section>
    </main>
  )
}
