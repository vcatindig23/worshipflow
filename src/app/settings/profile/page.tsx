import Link from "next/link"
import { ArrowLeft, UserRound } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateProfileDisplayName } from "./actions"

type ProfileSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  invalid_name: "Enter a name between 2 and 120 characters.",
  save_failed: "Your name could not be saved. Please try again.",
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProfileSettingsPage({
  searchParams,
}: ProfileSettingsPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error("Failed to load profile settings:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to load your profile settings.")
  }

  if (!profile) {
    throw new Error("Your profile could not be found.")
  }

  const errorMessage = errorMessages[getParam(params.error) ?? ""]

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-6 py-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Settings
      </Link>

      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <UserRound className="size-3.5" />
          Personal Settings
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Your profile
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Choose the name your church team sees in member lists and service assignments.
        </p>
      </section>

      {getParam(params.saved) === "true" ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Your name has been saved.
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      <form
        action={updateProfileDisplayName}
        className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm"
      >
        <label
          htmlFor="displayName"
          className="mb-2 block text-sm font-medium text-[var(--foreground)]"
        >
          Name shown to your team
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          defaultValue={profile.display_name}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
        />
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          This is separate from your email address and WorshipFlow access role.
        </p>
        <button
          type="submit"
          className="mt-5 h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
        >
          Save name
        </button>
      </form>
    </main>
  )
}
