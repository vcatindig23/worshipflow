import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import ProfileAvatar from "@/components/profile-avatar"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
import { createClient } from "@/lib/supabase/server"
import { teamPositionLabels, getTeamPositionLabel } from "@/lib/team-positions"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { uuidSchema } from "@/lib/team-access-validation"

type MemberProfilePageProps = {
  params: Promise<{
    userId: string
  }>
}

type ProfileRecord = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  website: string | null
}

type MembershipRecord = {
  user_id: string
  role: string
  team_positions: string[] | null
  created_at: string
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  worship_leader: "Worship Leader",
  song_editor: "Song Editor",
  team_member: "Team Member",
  viewer: "Viewer",
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date)
}

function getSafeWebsite(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export default async function MemberProfilePage({
  params,
}: MemberProfilePageProps) {
  const { userId } = await params

  if (!uuidSchema.safeParse(userId).success) {
    notFound()
  }

  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  if (userId === workspace.userId) {
    redirect("/profile")
  }

  const supabase = await createClient()

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, location, website")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select("user_id, role, team_positions, created_at")
      .eq("organization_id", workspace.organizationId)
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (profileResult.error) {
    console.error("Failed to load team member profile:", {
      code: profileResult.error.code,
      message: profileResult.error.message,
    })
    throw new Error("Unable to load this team member's profile.")
  }

  if (membershipResult.error) {
    console.error("Failed to load team member membership:", {
      code: membershipResult.error.code,
      message: membershipResult.error.message,
    })
    throw new Error("Unable to load this team member's church membership.")
  }

  // Only members of the active church workspace can be viewed here.
  // The profile table's RLS policy also restricts reads to self or shared
  // organization membership.
  if (!membershipResult.data || !profileResult.data) {
    notFound()
  }

  const profile = profileResult.data as ProfileRecord
  const membership = membershipResult.data as MembershipRecord
  const displayName = profile.display_name?.trim() || "Worship Member"
  const positions = membership.team_positions ?? []
  const avatarUrls = await getProfileAvatarUrlMap(supabase, [
    profile.avatar_url,
  ])
  const avatarUrl = profile.avatar_url
    ? avatarUrls.get(profile.avatar_url) ?? null
    : null
  const websiteUrl = getSafeWebsite(profile.website)
  const cardClass =
    "rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/settings/team"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to team
      </Link>

      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#101f31] via-[#294d69] to-[#527f9a] sm:h-48">
          <div aria-hidden="true" className="absolute -right-10 -top-24 size-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute right-16 -top-16 size-60 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-28 left-[26%] size-64 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute left-5 top-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 sm:left-8 sm:top-7">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-white/70" />
            WorshipFlow member profile
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <ProfileAvatar
              name={displayName}
              imageUrl={avatarUrl}
              sizeClassName="size-24 sm:size-32"
              className="-mt-12 text-2xl ring-4 ring-[var(--card)] sm:-mt-14"
            />

            <div className="min-w-0 flex-1 pt-1 sm:pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {displayName}
                </h1>
                <CheckCircle2
                  className="size-5 text-[var(--brand)]"
                  aria-label="WorshipFlow member"
                />
              </div>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {workspace.organizationName}
                <span className="px-1.5">·</span>
                {roleLabels[membership.role] ?? "Team member"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    {profile.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  Member since {formatDate(membership.created_at)}
                </span>
                {websiteUrl ? (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                    Website
                  </a>
                ) : null}
              </div>
            </div>

            <Link
              href="/chat"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] sm:mt-4"
            >
              <Users aria-hidden="true" className="size-4" />
              Team chat
            </Link>
          </div>

          {positions.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {positions.map((position) => (
                <span
                  key={position}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/15 bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]"
                >
                  {getTeamPositionLabel(position)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--muted)]">
              This member has not added worship-team positions yet.
            </p>
          )}
        </div>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <section className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
            Introduction
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">
            About {displayName}
          </h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--foreground)]">
            {profile.bio || "This member hasn't added an introduction yet."}
          </p>
        </section>

        <aside className={cardClass + " space-y-4"}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">
              Member details
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Ministry profile
            </h2>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 text-[var(--muted)]" />
            <div>
              <p className="text-xs text-[var(--muted)]">Workspace access</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                {roleLabels[membership.role] ?? "Team member"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users aria-hidden="true" className="mt-0.5 size-4 text-[var(--muted)]" />
            <div>
              <p className="text-xs text-[var(--muted)]">Church</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                {workspace.organizationName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays aria-hidden="true" className="mt-0.5 size-4 text-[var(--muted)]" />
            <div>
              <p className="text-xs text-[var(--muted)]">Member since</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">
                {formatDate(membership.created_at)}
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs text-[var(--muted)]">Worship-team positions</p>
            {positions.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {positions.map((position) => (
                  <span
                    key={position}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)]"
                  >
                    {teamPositionLabels[position] ?? position}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-[var(--muted)]">Not added</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}


export const metadata: Metadata = { title: "Team member profile" }
