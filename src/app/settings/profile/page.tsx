import { buttonVariants } from "@/components/ui/button"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { Feedback } from "@/components/ui/feedback"
import { ProtectedForm } from "@/components/ui/protected-form"
import { Input, Textarea } from "@/components/ui/form-controls"
import { PageContainer } from "@/components/ui/page"
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
import { teamPositionLabels } from "@/lib/team-positions"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateProfile } from "./actions"

type ProfileSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  invalid_name: "Enter a name between 2 and 120 characters.",
  invalid_avatar:
    "Choose a valid PNG, JPEG, or WebP image that is no larger than 5 MB.",
  avatar_upload_failed:
    "Your photo could not be uploaded. Please try again.",
  save_failed: "Your profile could not be saved. Please try again.",
  invalid_bio: "Your bio must be 500 characters or fewer.",
  invalid_location: "Your location must be 120 characters or fewer.",
  invalid_website: "Enter a valid website address using HTTP or HTTPS.",
  invalid_team_positions: "Select up to 10 valid worship-team positions.",
  team_positions_failed: "Your profile was saved, but worship-team positions could not be updated. Please retry.",
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
      .select("display_name, avatar_url, bio, location, website, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("organization_id, role, team_positions, created_at, organizations (name)")
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
  const profileBio = profile.bio ?? ""
  const profileLocation = profile.location ?? ""
  const profileWebsite = profile.website ?? ""
  const organizationId = membership?.organization_id ?? ""
  const selectedTeamPositions = (membership?.team_positions ?? []) as string[]
  let avatarUrl: string | null = null
  if (profile.avatar_url?.startsWith(`${user.id}/`)) {
    const { data: signedAvatar, error: avatarError } = await supabase.storage
      .from("profile-avatars")
      .createSignedUrl(profile.avatar_url, 60 * 60)

    if (avatarError) {
      console.error("Failed to create profile avatar URL:", {
        message: avatarError.message,
      })
      throw new Error("Unable to load your profile photo.")
    }

    avatarUrl = signedAvatar.signedUrl
  }
  const errorMessage = errorMessages[getParam(params.error) ?? ""]
  const emailConfirmed = Boolean(user.email_confirmed_at)
  const warningMessage =
    getParam(params.warning) === "avatar_cleanup_failed"
      ? "Your new photo was saved, but an old copy could not be removed."
      : null

  return (
    <PageContainer className="max-w-5xl">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Settings
      </Link>

      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <UserRound className="size-3.5" />
          Personal Settings
        </span>
        <h1 className="wf-page-title mt-3">
          Your profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Manage how your church team sees you and review your account details.
        </p>
        </div>
        <Link
          href="/profile"
          className={buttonVariants({ variant: "outline", className: "h-10 min-h-10 px-4" })}
        >
          <UserRound className="size-4" />
          View profile
        </Link>
      </section>

      {getParam(params.saved) === "true" ? (
        <Feedback tone="success" title="Changes saved">Your profile has been saved.</Feedback>
      ) : null}

      {errorMessage ? (
        <Feedback tone="error" title="Changes could not be saved">{errorMessage} Review your entries and try saving again.</Feedback>
      ) : null}

      {warningMessage ? (
        <Feedback tone="warning" title="Photo cleanup incomplete">
          {warningMessage}
        </Feedback>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <ProtectedForm
          action={updateProfile}
          className="wf-card p-6 sm:p-7"
        >
          {organizationId ? (
            <input type="hidden" name="organizationId" value={organizationId} />
          ) : null}
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
              <Input
                id="displayName"
                name="displayName"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                defaultValue={displayName}
                className="w-full px-3.5"
              />
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Use the name your worship team knows you by.
              </p>
            </div>

            <div>
              <label
                htmlFor="bio"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                About you
              </label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={500}
                defaultValue={profileBio}
                placeholder="Share a little about yourself and your heart for worship."
                className="w-full px-3.5 py-3"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">Up to 500 characters.</p>
            </div>

            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Location
              </label>
              <Input
                id="location"
                name="location"
                type="text"
                maxLength={120}
                defaultValue={profileLocation}
                placeholder="City or region"
                className="w-full px-3.5"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Website or social link
              </label>
              <Input
                id="website"
                name="website"
                type="text"
                maxLength={250}
                inputMode="url"
                autoComplete="url"
                defaultValue={profileWebsite}
                placeholder="yourwebsite.com"
                className="w-full px-3.5"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">Only HTTP and HTTPS links are allowed.</p>
            </div>

            <div>
              <label
                htmlFor="avatar"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
              >
                <Camera className="size-4 text-[var(--muted)]" />
                Upload profile photo
              </label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-describedby="avatarHelp"
                className="block w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)] file:mr-4 file:cursor-pointer file:border-0 file:bg-[var(--surface)] file:px-4 file:py-3 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-[var(--brand-soft)]"
              />
              <p
                id="avatarHelp"
                className="mt-2 text-xs leading-5 text-[var(--muted)]"
              >
                PNG, JPEG, or WebP only. Maximum file size: 5 MB.
              </p>
              {profile.avatar_url ? (
                <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    name="removeAvatar"
                    className="size-4 rounded border-[var(--border)] accent-[var(--brand)]"
                  />
                  Remove current photo and use initials
                </label>
              ) : null}
            </div>
          </div>

          {membership ? (
            <section className="mt-7 border-t border-[var(--border)] pt-6">
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">
                  Worship-team positions
                </h3>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Choose the roles you serve in, such as drummer, vocalist, guitarist, or sound engineer. Your church administrator can also help manage team assignments.
                </p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Object.entries(teamPositionLabels).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm text-[var(--foreground)] transition hover:border-[var(--brand)] hover:bg-[var(--surface)]"
                  >
                    <input
                      type="checkbox"
                      name="teamPositions"
                      value={value}
                      defaultChecked={selectedTeamPositions.includes(value)}
                      className="size-4 rounded border-[var(--border)] accent-[var(--brand)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Select up to 10 positions. These appear on your profile and help teammates identify your ministry roles.
              </p>
            </section>
          ) : (
            <section className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">Worship-team positions</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Join a church workspace to add your worship roles to your profile.</p>
            </section>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
            <p className="text-xs text-[var(--muted)]">
              Email and access role are managed by your account and church
              administrator.
            </p>
            <FormSubmitButton pendingText="Saving changes…"
              className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Save profile
            </FormSubmitButton>
          </div>
        </ProtectedForm>

        <aside className="space-y-5">
          <section className="wf-card p-6">
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
                  <dd className="mt-2">
                    <span className={`wf-status ${emailConfirmed ? "wf-status-success" : "wf-status-warning"}`}>
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
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
            <Feedback tone="warning" title="No church workspace yet">
              Complete onboarding or accept a team invitation to see your
              church membership here.
            </Feedback>
          ) : null}
        </aside>
      </div>
    </PageContainer>
  )
}
