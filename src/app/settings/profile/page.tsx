import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Camera,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateProfile } from "./actions"

type ProfileSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  invalid_name: "Enter a name between 2 and 120 characters.",
  invalid_avatar: "Enter a valid HTTPS image URL up to 500 characters long.",
  save_failed: "Your profile could not be saved. Please try again.",
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  worship_leader: "Worship Leader",
  song_editor: "Song Editor",
  team_member: "Team Member",
  viewer: "Viewer",
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase()
}

function isHttpsUrl(value: string | null) {
  if (!value) {
    return false
  }

  try {
    return new URL(value).protocol === "https:"
  } catch (error) {
    if (error instanceof TypeError) {
      return false
    }

    throw error
  }
}

export default async function ProfileSettingsPage({
  searchParams,
}: ProfileSettingsPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error("Failed to load profile account:", {
      message: userError.message,
    })
    throw new Error("Unable to load your account details.")
  }

  const user = userData.user

  if (!user) {
    redirect("/login")
  }

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("role, organizations (name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle(),
  ])

  if (profileResult.error) {
    console.error("Failed to load profile settings:", {
      code: profileResult.error.code,
      message: profileResult.error.message,
    })
    throw new Error("Unable to load your profile settings.")
  }

  if (membershipResult.error) {
    console.error("Failed to load profile membership:", {
      code: membershipResult.error.code,
      message: membershipResult.error.message,
    })
    throw new Error("Unable to load your church membership.")
  }

  const profile = profileResult.data

  if (!profile) {
    throw new Error("Your profile could not be found.")
  }

  const membership = membershipResult.data
  const organization = Array.isArray(membership?.organizations)
    ? membership.organizations[0]
    : membership?.organizations
  const displayName = profile.display_name
  const avatarUrl = isHttpsUrl(profile.avatar_url)
    ? profile.avatar_url
    : null
  const errorMessage = errorMessages[getParam(params.error) ?? ""]
  const emailConfirmed = Boolean(user.email_confirmed_at)

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-6 py-8">
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
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Manage how your church team sees you and review your account details.
        </p>
      </section>

      {getParam(params.saved) === "true" ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Your profile has been saved.
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

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          action={updateProfile}
          className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
            <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--brand-soft)] text-lg font-bold text-[var(--brand)]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${displayName}'s profile photo`}
                  width={64}
                  height={64}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                Personal information
              </h2>
              <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
                This is the identity teammates see on assignments and team lists.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
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
                defaultValue={displayName}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Use the name your worship team knows you by.
              </p>
            </div>

            <div>
              <label
                htmlFor="avatarUrl"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
              >
                <Camera className="size-4 text-[var(--muted)]" />
                Profile photo URL
              </label>
              <input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                maxLength={500}
                inputMode="url"
                autoComplete="url"
                defaultValue={profile.avatar_url ?? ""}
                placeholder="https://example.com/your-photo.jpg"
                aria-describedby="avatarHelp"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />
              <p
                id="avatarHelp"
                className="mt-2 text-xs leading-5 text-[var(--muted)]"
              >
                Optional. Use a publicly accessible HTTPS image link. Clear the
                field to use your initials instead.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
            <p className="text-xs text-[var(--muted)]">
              Email and access role are managed by your account and church
              administrator.
            </p>
            <button
              type="submit"
              className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Save profile
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">
                  Account details
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Sign-in and membership information
                </p>
              </div>
            </div>

            <dl className="mt-5 divide-y divide-[var(--border)]">
              <div className="py-4 first:pt-0">
                <dt className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <Mail className="size-3.5" />
                  Sign-in email
                </dt>
                <dd className="mt-1 break-all text-sm font-medium text-[var(--foreground)]">
                  {user.email ?? "No email address on this account"}
                </dd>
                {user.email ? (
                  <dd className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium">
                    <BadgeCheck
                      className={`size-3.5 ${emailConfirmed ? "text-emerald-600" : "text-amber-600"}`}
                    />
                    <span
                      className={
                        emailConfirmed ? "text-emerald-700" : "text-amber-700"
                      }
                    >
                      {emailConfirmed ? "Email verified" : "Email not verified"}
                    </span>
                  </dd>
                ) : null}
              </div>

              <div className="py-4">
                <dt className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <Building2 className="size-3.5" />
                  Church workspace
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {organization?.name ?? "No church workspace"}
                </dd>
              </div>

              <div className="py-4 last:pb-0">
                <dt className="text-xs font-medium text-[var(--muted)]">
                  Workspace role
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {membership
                    ? roleLabels[membership.role] ?? "Member"
                    : "Not assigned"}
                </dd>
              </div>
            </dl>
          </section>

          {!membership ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">
                You are not in a church workspace yet
              </p>
              <p className="mt-1 text-sm leading-5 text-amber-800">
                Complete onboarding or accept a team invitation to see your
                church membership here.
              </p>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
