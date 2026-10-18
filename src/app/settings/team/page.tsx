import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Search,
  SlidersHorizontal,
  UserMinus,
  Users,
  X,
} from "lucide-react"
import ProfileAvatar from "@/components/profile-avatar"
import { TeamInvitation } from "@/components/ui/team-invitation"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createClient } from "@/lib/supabase/server"
import { teamPositionLabels } from "@/lib/team-positions"
import InviteMemberForm from "./invite-member-form"
import {
  removeMember,
  revokeInvitation,
  updateMemberRole,
  updateMemberTeamPositions,
} from "./actions"

type TeamPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type MemberProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type MemberRow = {
  user_id: string
  role: string
  team_positions: string[]
  created_at: string
}

type InvitationRow = {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  worship_leader: "Worship Leader",
  song_editor: "Song Editor",
  team_member: "Team Member",
  viewer: "Viewer",
}

const teamPositionOptions = Object.entries(
  teamPositionLabels
)

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const errorMessages: Record<string, string> = {
  invalid_invitation:
    "The invitation information is invalid.",
  invite_revoke_failed:
    "The invitation could not be revoked.",
  invalid_member_update:
    "The member role information is invalid.",
  member_role_failed:
    "The member role could not be updated.",
  invalid_team_positions:
    "Select valid worship-team positions (up to 10).",
  team_positions_failed:
    "The member's worship-team positions could not be updated.",
  invalid_member:
    "The member information is invalid.",
  membership_not_found:
    "Your church membership could not be found.",
  membership_load_failed:
    "Your church membership could not be loaded.",
  administrator_required:
    "Only administrators can perform that action.",
  cannot_remove_self:
    "You cannot remove your own account from the church.",
}

export default async function TeamSettingsPage({
  searchParams,
}: TeamPageProps) {
  const params = await searchParams
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const canManageTeam = workspace.role === "admin"

  const supabase = await createClient()

  const [
    organizationResult,
    membersResult,
    invitationsResult,
    claimsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq(
        "id",
        workspace.organizationId
      )
      .maybeSingle(),

    supabase
      .from("organization_members")
      .select(
        "user_id, role, created_at"
      )
      .eq(
        "organization_id",
        workspace.organizationId
      )
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("organization_invitations")
      .select(
        "id, email, role, status, created_at, expires_at"
      )
      .eq(
        "organization_id",
        workspace.organizationId
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      }),

    supabase.auth.getClaims(),
  ])

  if (organizationResult.error) {
    console.error(
      "Failed to load organization:",
      {
        code:
          organizationResult.error.code,
        message:
          organizationResult.error.message,
        details:
          organizationResult.error.details,
        hint:
          organizationResult.error.hint,
      }
    )
  }

  if (membersResult.error) {
    console.error(
      "Failed to load organization members:",
      {
        code: membersResult.error.code,
        message:
          membersResult.error.message,
        details:
          membersResult.error.details,
        hint:
          membersResult.error.hint,
      }
    )
  }

  if (invitationsResult.error) {
    console.error(
      "Failed to load organization invitations:",
      {
        code:
          invitationsResult.error.code,
        message:
          invitationsResult.error.message,
        details:
          invitationsResult.error.details,
        hint:
          invitationsResult.error.hint,
      }
    )
  }

  const organization =
    organizationResult.data

  if (!organization) {
    redirect("/settings/church")
  }

  const currentUserId =
    claimsResult.data?.claims?.sub

  let members =
    (membersResult.data ??
      []) as MemberRow[]

  let teamPositionsUnavailable = false
  if (!membersResult.error && members.length > 0) {
    const { data: positionRows, error: positionsError } =
      await supabase
        .from("organization_members")
        .select("user_id, team_positions")
        .eq("organization_id", workspace.organizationId)
        .in(
          "user_id",
          members.map((member) => member.user_id)
        )

    if (positionsError) {
      teamPositionsUnavailable = true
      console.error("Failed to load worship-team positions:", {
        code: positionsError.code,
        message: positionsError.message,
      })
    }

    const positionsByUser = new Map(
      (positionRows ?? []).map((row) => [
        row.user_id,
        row.team_positions as string[],
      ])
    )

    members = members.map((member) => ({
      ...member,
      team_positions: positionsByUser.get(member.user_id) ?? [],
    }))
  }

  const invitations =
    (invitationsResult.data ??
      []) as InvitationRow[]

  const memberUserIds =
    members.map(
      (member) => member.user_id
    )

  let profiles: MemberProfile[] = []

  if (memberUserIds.length > 0) {
    const {
      data: profilesData,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url"
      )
      .in(
        "id",
        memberUserIds
      )

    if (profilesError) {
      console.error(
        "Failed to load member profiles:",
        {
          code: profilesError.code,
          message:
            profilesError.message,
          details:
            profilesError.details,
          hint:
            profilesError.hint,
        }
      )
    }

    profiles =
      (profilesData ??
        []) as MemberProfile[]
  }

  const profileMap =
    new Map(
      profiles.map((profile) => [
        profile.id,
        profile,
      ])
    )
  const avatarUrls = await getProfileAvatarUrlMap(
    supabase,
    profiles.map((profile) => profile.avatar_url)
  )

  const errorKey =
    typeof params.error === "string"
      ? params.error
      : ""

  const errorMessage =
    errorKey
      ? errorMessages[errorKey] ??
        "The requested action could not be completed."
      : ""
  const query = getParam(params.q)?.trim() ?? ""
  const requestedRole = getParam(params.role) ?? "all"
  const selectedRole = Object.prototype.hasOwnProperty.call(
    roleLabels,
    requestedRole
  )
    ? requestedRole
    : "all"
  const normalizedQuery = query.toLocaleLowerCase("en")
  const filteredMembers = members.filter((member) => {
    if (selectedRole !== "all" && member.role !== selectedRole) {
      return false
    }

    const profile = profileMap.get(member.user_id)
    const displayName = profile?.display_name?.trim() || "Name not set"
    const searchableText = [
      displayName,
      roleLabels[member.role] ?? member.role,
      ...(member.team_positions ?? []).map(
        (position) => teamPositionLabels[position] ?? position
      ),
    ]
      .join(" ")
      .toLocaleLowerCase("en")

    return !normalizedQuery || searchableText.includes(normalizedQuery)
  })

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <Link
        href="/settings/church"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Church Settings
      </Link>

      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            <Users className="size-3.5" />
            Team Management
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {organization.name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Invite your worship team, assign roles, and manage access to your church workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-[var(--muted)]">
            Members
          </p>

          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
            {members.length}
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {membersResult.error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          The church members could not be loaded. Please refresh the page and try again.
        </div>
      ) : null}

      {teamPositionsUnavailable ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Members are loaded, but worship-team positions are unavailable until
          the team-position database migration is applied.
        </div>
      ) : null}

      {canManageTeam ? (
        <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Invite a Team Member
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Choose the member&apos;s initial role when creating the invitation.
            </p>
          </div>

          <InviteMemberForm />
        </section>
      ) : null}

      {canManageTeam && invitations.length > 0 ? (
        <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Pending Invitations
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              These people have not joined yet.
            </p>
          </div>

          <div className="space-y-3">
            {invitations.map((invitation) => (
              <TeamInvitation
                key={invitation.id}
                email={invitation.email}
                organizationName={organization.name}
                roleLabel={
                  roleLabels[invitation.role] ??
                  invitation.role
                }
                createdAt={invitation.created_at}
                expiresAt={invitation.expires_at}
                actions={
                  <form action={revokeInvitation} className="shrink-0">
                    <input
                      type="hidden"
                      name="invitationId"
                      value={invitation.id}
                    />
                    <button
                      type="submit"
                      aria-label={`Revoke invitation for ${invitation.email}`}
                      title="Revoke invitation"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </form>
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Church Members
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {canManageTeam
                ? "Administrators can change app access and worship-team positions."
                : "Application access and worship-team positions for your church members."}
            </p>

            <p className="mt-2 text-xs font-medium text-[var(--muted)]" aria-live="polite">
              Showing {filteredMembers.length} of {members.length} members
            </p>
          </div>

          <details className="group w-full xl:max-w-[440px]">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 outline-none transition hover:border-[var(--brand)]/30 hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                <Search className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--foreground)]">Search & filter members</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                  {query
                    ? "Search: " + query + (selectedRole !== "all" ? " · " + roleLabels[selectedRole] : "")
                    : selectedRole !== "all"
                      ? "Role: " + roleLabels[selectedRole]
                      : "Find by name, worship position, or role"}
                </span>
              </span>
              {query || selectedRole !== "all" ? (
                <span className="shrink-0 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)]">
                  Active
                </span>
              ) : null}
              <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <form
            action="/settings/team"
            method="get"
            role="search"
            className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search members by name or worship position</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="search"
                name="q"
                value={query}
                maxLength={100}
                placeholder="Search name or worship position..."
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />
            </label>

            <label>
              <span className="sr-only">Filter members by workspace role</span>
              <select
                name="role"
                value={selectedRole}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)] sm:w-44"
              >
                <option value="all">All workspace roles</option>
                <option value="admin">Administrator</option>
                <option value="worship_leader">Worship Leader</option>
                <option value="song_editor">Song Editor</option>
                <option value="team_member">Team Member</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]"
            >
              <SlidersHorizontal className="size-4" />
              Filter
            </button>

            {query || selectedRole !== "all" ? (
              <Link
                href="/settings/team"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                Clear
              </Link>
            ) : null}
          </form>
            </div>
          </details>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {filteredMembers.map(
            (member) => {
              const profile =
                profileMap.get(
                  member.user_id
                )

              const displayName =
                profile?.display_name?.trim() ||
                "Name not set"

              const isCurrentUser =
                member.user_id ===
                currentUserId

              const profileHref = isCurrentUser
                ? "/profile"
                : "/profile/" + member.user_id

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      href={profileHref}
                      aria-label={"View " + displayName + "'s profile"}
                      className="shrink-0 rounded-full outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
                    >
                      <ProfileAvatar
                        name={displayName}
                        imageUrl={
                          profile?.avatar_url
                            ? avatarUrls.get(profile.avatar_url)
                            : null
                        }
                        sizeClassName="size-10"
                      />
                    </Link>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={profileHref}
                          className="truncate font-medium text-[var(--foreground)] underline-offset-4 transition hover:text-[var(--brand)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        >
                          {displayName}
                        </Link>

                        {isCurrentUser ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--brand)]">
                            <CheckCircle2 className="size-3" />
                            You
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {roleLabels[
                          member.role
                        ] ??
                          member.role}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {member.team_positions?.length ? (
                          member.team_positions.map((position) => (
                            <span
                              key={position}
                              className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)]"
                            >
                              {teamPositionLabels[position] ?? position}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[var(--muted)]">
                            No worship-team positions assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageTeam ? (
                    <div className="flex flex-col gap-3 md:items-end">
                      <form
                        action={
                          updateMemberRole
                        }
                        className="flex items-center gap-2"
                      >
                      <input
                        type="hidden"
                        name="userId"
                        value={
                          member.user_id
                        }
                      />

                      <select
                        name="role"
                        defaultValue={
                          member.role
                        }
                        className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                      >
                        <option value="admin">
                          Administrator
                        </option>
                        <option value="worship_leader">
                          Worship Leader
                        </option>
                        <option value="song_editor">
                          Song Editor
                        </option>
                        <option value="team_member">
                          Team Member
                        </option>
                        <option value="viewer">
                          Viewer
                        </option>
                      </select>

                      <button
                        type="submit"
                        className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                      >
                        Save
                      </button>
                      </form>

                      {!teamPositionsUnavailable ? (
                      <details className="w-full md:max-w-sm">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--brand)] hover:underline">
                          Edit worship positions
                        </summary>

                        <form
                          action={updateMemberTeamPositions}
                          className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={member.user_id}
                          />
                          <fieldset>
                            <legend className="mb-2 text-xs font-semibold text-[var(--foreground)]">
                              Select all that apply
                            </legend>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                              {teamPositionOptions.map(
                                ([value, label]) => (
                                  <label
                                    key={value}
                                    className="flex items-center gap-2 text-xs text-[var(--foreground)]"
                                  >
                                    <input
                                      type="checkbox"
                                      name="teamPositions"
                                      value={value}
                                      defaultChecked={member.team_positions?.includes(
                                        value
                                      )}
                                      className="size-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]"
                                    />
                                    {label}
                                  </label>
                                )
                              )}
                            </div>
                          </fieldset>
                          <button
                            type="submit"
                            className="mt-3 h-9 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                          >
                            Save positions
                          </button>
                        </form>
                      </details>
                      ) : null}

                      {!isCurrentUser ? (
                        <form
                          action={
                            removeMember
                          }
                        >
                        <input
                          type="hidden"
                          name="userId"
                          value={
                            member.user_id
                          }
                        />

                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                        >
                          <UserMinus className="size-3.5" />
                          Remove
                        </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            }
          )}

          {filteredMembers.length === 0 &&
          !membersResult.error ? (
            <div className="py-12 text-center">
              <Users className="mx-auto size-8 text-[var(--muted)]" />

              <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                {members.length === 0 ? "No members found" : "No members match your filters"}
              </p>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {members.length === 0
                  ? "Invite your worship team to get started."
                  : "Try a different name, worship position, or workspace role."}
              </p>

              {members.length > 0 ? (
                <Link
                  href="/settings/team"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--brand)] hover:underline"
                >
                  Clear filters
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}