import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Globe2,
  MapPin,
  Phone,
  Save,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateChurchSettings } from "./actions"

type ChurchSettingsPageProps = {
  searchParams: Promise<{
    error?: string
    saved?: string
  }>
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

const errors: Record<string, string> = {
  invalid_details:
    "Please review the information and correct the invalid fields.",
  membership_failed:
    "We could not verify your church workspace.",
  not_authorized:
    "Only a church administrator can change church settings.",
  update_failed:
    "We could not save the church settings. Please try again.",
}

export default async function ChurchSettingsPage({
  searchParams,
}: ChurchSettingsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw new Error("Unable to determine church membership.")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select(
      "id, name, description, contact_email, contact_phone, address, website, timezone, default_service_name, default_service_day, default_service_time"
    )
    .eq("id", membership.organization_id)
    .maybeSingle()

  if (organizationError) {
    throw new Error("Unable to load church settings.")
  }

  if (!organization) {
    throw new Error("Church workspace not found.")
  }

  const errorMessage = params.error ? errors[params.error] : null

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>

          <div className="text-sm font-semibold">Church settings</div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-[var(--brand)]">
            Workspace management
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
            Church settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Update the information you provided during onboarding.
          </p>
        </div>

        {params.saved === "true" ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
          >
            Church settings saved successfully.
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        {membership.role !== "admin" ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
            You can view this information, but only the church administrator
            can change it.
          </div>
        ) : null}

        <form action={updateChurchSettings} className="mt-6 space-y-6">
          <fieldset disabled={membership.role !== "admin"} className="space-y-6">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Building2 className="size-5" />
                </div>

                <div>
                  <h2 className="font-semibold">Church information</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Basic information about your worship workspace.
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
                    defaultValue={organization.name}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="description"
                    className="mb-2 block text-sm font-medium"
                  >
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    maxLength={1000}
                    defaultValue={organization.description ?? ""}
                    className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                    defaultValue={organization.contact_email ?? ""}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                    defaultValue={organization.contact_phone ?? ""}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="address"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <MapPin className="size-4 text-[var(--muted)]" />
                    Address
                  </label>

                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    maxLength={500}
                    defaultValue={organization.address ?? ""}
                    className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="website"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <Globe2 className="size-4 text-[var(--muted)]" />
                    Website
                  </label>

                  <input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={organization.website ?? ""}
                    placeholder="https://example.com"
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                    Defaults used when creating future church services.
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
                    defaultValue={organization.default_service_name}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                    defaultValue={String(organization.default_service_day)}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                    defaultValue={organization.default_service_time.slice(
                      0,
                      5
                    )}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
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
                  defaultValue={organization.timezone}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] disabled:bg-[var(--surface)]"
                >
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </fieldset>

          {membership.role === "admin" ? (
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
              >
                <Save className="size-4" />
                Save church settings
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </main>
  )
}