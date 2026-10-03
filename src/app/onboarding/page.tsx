import Link from "next/link"
import {
  Building2,
  CalendarClock,
  Globe2,
  MapPin,
  Music2,
  Phone,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createOrganization } from "./actions"

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  invalid_details:
    "Please review the fields and correct the highlighted information.",
  membership_check_failed:
    "We could not verify your church membership.",
  create_failed:
    "We could not create your church workspace.",
  setup_failed:
    "The workspace was created, but the setup information could not be saved.",
}

const days = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const timezones = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
]

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to determine church membership.")
  }

  if (membership) {
    redirect("/")
  }

  const errorMessage = params.error
    ? errorMessages[params.error] ?? "Something went wrong."
    : null

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <Link
            href="/"
            className="mx-auto mb-7 flex w-fit items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
              <Music2 className="size-5" />
            </div>

            <span className="text-lg font-semibold tracking-[-0.025em]">
              WorshipFlow
            </span>
          </Link>

          <div className="text-sm font-medium text-[var(--brand)]">
            Step 1 of 1
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Set up your church
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Tell WorshipFlow about your church and your regular worship
            service. You can change these settings later.
          </p>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        <form action={createOrganization} className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Building2 className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold">Church information</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Basic information about your church workspace.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Church name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="New Life Christian Church"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium"
                >
                  Church description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={1000}
                  placeholder="Tell your team a little about your church or worship ministry."
                  className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="contactEmail"
                  className="mb-2 block text-sm font-medium"
                >
                  Church email
                </label>

                <input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="church@example.com"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="contactPhone"
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                >
                  <Phone className="size-4 text-[var(--muted)]" />
                  Church phone
                </label>

                <input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  maxLength={50}
                  placeholder="+63 900 000 0000"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                >
                  <MapPin className="size-4 text-[var(--muted)]" />
                  Church address
                </label>

                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  maxLength={500}
                  placeholder="Church address"
                  className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="website"
                  className="mb-2 flex items-center gap-2 text-sm font-medium"
                >
                  <Globe2 className="size-4 text-[var(--muted)]" />
                  Church website
                </label>

                <input
                  id="website"
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <CalendarClock className="size-5" />
              </div>

              <div>
                <h2 className="font-semibold">Service defaults</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  These values will be used when you create new services.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="defaultServiceName"
                  className="mb-2 block text-sm font-medium"
                >
                  Service name
                </label>

                <input
                  id="defaultServiceName"
                  name="defaultServiceName"
                  type="text"
                  required
                  maxLength={120}
                  defaultValue="Sunday Worship"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="defaultServiceDay"
                  className="mb-2 block text-sm font-medium"
                >
                  Service day
                </label>

                <select
                  id="defaultServiceDay"
                  name="defaultServiceDay"
                  defaultValue="0"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                >
                  {days.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="defaultServiceTime"
                  className="mb-2 block text-sm font-medium"
                >
                  Service time
                </label>

                <input
                  id="defaultServiceTime"
                  name="defaultServiceTime"
                  type="time"
                  required
                  defaultValue="09:00"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="timezone"
                className="mb-2 block text-sm font-medium"
              >
                Time zone
              </label>

              <select
                id="timezone"
                name="timezone"
                defaultValue="Asia/Manila"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
              >
                {timezones.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-[var(--muted)]">
                This will be used when displaying service dates and times.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--brand-soft)] p-5 sm:p-7">
            <h2 className="font-semibold">You&apos;re almost ready</h2>

            <p className="mt-2 text-sm leading-6 text-[var(--brand-dark)]">
              Your account will become the administrator of this church
              workspace. After setup, you&apos;ll be able to build your song
              library, prepare setlists, schedule services, and invite your
              worship team.
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold transition hover:bg-[var(--surface)]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
            >
              Complete setup
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}