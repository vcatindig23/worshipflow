import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Church,
  Clock3,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createChurch } from "./actions"

type OnboardingPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

const errorMessages: Record<
  string,
  string
> = {
  invalid_form:
    "Please review the highlighted information and try again.",
  create_failed:
    "The church could not be created. Please try again.",
  details_failed:
    "The church was created, but its details could not be saved.",
}

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams
  const mode =
    getParam(params.mode) ?? "choice"
  const error =
    getParam(params.error) ?? ""

  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId =
    claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const {
    data: membership,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (membership) {
    redirect("/")
  }

  if (mode === "choice") {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
          <div className="w-full">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-sm">
                <Church className="size-6" />
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
                Welcome to WorshipFlow
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
                Where should we start?
              </h1>

              <p className="mt-3 text-sm leading-6 text-[var(--muted)] md:text-base">
                Create a workspace for your church or join a church
                that has already invited you.
              </p>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <Link
                href="/onboarding?mode=create"
                className="group rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Church className="size-6" />
                </div>

                <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">
                  Create a New Church
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Set up your church&apos;s WorshipFlow workspace.
                  You will automatically become its administrator.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
                  Create Workspace
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/onboarding/join"
                className="group rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--brand)]">
                  <Users className="size-6" />
                </div>

                <h2 className="mt-5 text-xl font-bold text-[var(--foreground)]">
                  Join an Existing Church
                </h2>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Already invited by your worship leader or church
                  administrator? Enter your invitation code.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
                  Join Workspace
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          Back to choices
        </Link>

        <div className="mt-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            <Church className="size-3.5" />
            Create New Church
          </div>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Set up your church
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Complete the basics now. You can change these settings
            later from Church Settings.
          </p>
        </div>

        {errorMessages[error] ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {errorMessages[error]}
          </div>
        ) : null}

        <form
          action={createChurch}
          className="mt-7 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Church Information
              </h2>

              <div className="mt-4 space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Church name
                  </label>

                  <input
                    id="name"
                    name="name"
                    required
                    maxLength={200}
                    placeholder="Grace Community Church"
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
                    rows={4}
                    placeholder="A short description of your church."
                    className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Contact Information
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="contactEmail"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Contact email
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      maxLength={320}
                      placeholder="church@example.com"
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Contact phone
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                    <input
                      id="contactPhone"
                      name="contactPhone"
                      maxLength={50}
                      placeholder="+63 900 000 0000"
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="address"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Address
                  </label>

                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-[var(--muted)]" />

                    <textarea
                      id="address"
                      name="address"
                      maxLength={500}
                      rows={3}
                      placeholder="Church address"
                      className="w-full resize-y rounded-xl border border-[var(--border)] bg-white py-3 pl-10 pr-4 text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="website"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Website
                  </label>

                  <div className="relative">
                    <Globe2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                    <input
                      id="website"
                      name="website"
                      type="url"
                      maxLength={500}
                      placeholder="https://example.com"
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-[var(--border)] pt-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Default Service
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="defaultServiceName"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Service name
                  </label>

                  <input
                    id="defaultServiceName"
                    name="defaultServiceName"
                    required
                    maxLength={200}
                    defaultValue="Sunday Worship"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="defaultServiceDay"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Service day
                  </label>

                  <select
                    id="defaultServiceDay"
                    name="defaultServiceDay"
                    defaultValue="0"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--brand)]"
                  >
                    <option value="0">
                      Sunday
                    </option>
                    <option value="1">
                      Monday
                    </option>
                    <option value="2">
                      Tuesday
                    </option>
                    <option value="3">
                      Wednesday
                    </option>
                    <option value="4">
                      Thursday
                    </option>
                    <option value="5">
                      Friday
                    </option>
                    <option value="6">
                      Saturday
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="defaultServiceTime"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Service time
                  </label>

                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                    <input
                      id="defaultServiceTime"
                      name="defaultServiceTime"
                      type="time"
                      required
                      defaultValue="09:00"
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="timezone"
                    className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                  >
                    Timezone
                  </label>

                  <select
                    id="timezone"
                    name="timezone"
                    defaultValue="Asia/Manila"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none focus:border-[var(--brand)]"
                  >
                    <option value="Asia/Manila">
                      Asia/Manila
                    </option>
                    <option value="Asia/Singapore">
                      Asia/Singapore
                    </option>
                    <option value="Asia/Tokyo">
                      Asia/Tokyo
                    </option>
                    <option value="Australia/Sydney">
                      Australia/Sydney
                    </option>
                    <option value="UTC">
                      UTC
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                <span>
                  You will become the administrator of this church
                  workspace.
                </span>
              </div>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                Create Church
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}