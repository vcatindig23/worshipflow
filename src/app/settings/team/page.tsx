import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createClient } from "@/lib/supabase/server"
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

const teamPositionLabels: Record<string, string> = {
  worship_leader: "Worship Leader",
  singer: "Singer",
  lead_guitarist: "Lead Guitarist",
  rhythm_guitarist: "Rhythm Guitarist",
  acoustic_guitarist: "Acoustic Guitarist",
  electric_guitarist: "Electric Guitarist",
  bassist: "Bassist",
  keyboardist: "Keyboardist",
  pianist: "Pianist",
  drummer: "Drummer",
  percussionist: "Percussionist",
  violinist: "Violinist",
  cellist: "Cellist",
  sound_engineer: "Sound Engineer",
  audio_visual: "Audio / Visual",
  choir_member: "Choir Member",
  other: "Other",
}

const teamPositionOptions = Object.entries(
  teamPositionLabels
)

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

  if (workspace.role !== "admin") {
    redirect("/settings/church")
  }

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
        "user_id, role, team_positions, created_at"
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

  const members =
    (membersResult.data ??
      []) as MemberRow[]

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

  const errorKey =
    typeof params.error === "string"
      ? params.error
      : ""

  const errorMessage =
    errorKey
      ? errorMessages[errorKey] ??
        "The requested action could not be completed."
      : ""

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

      {invitations.length > 0 ? (
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
            {invitations.map(
              (invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {invitation.email}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                      <span>
                        {roleLabels[
                          invitation.role
                        ] ??
                          invitation.role}
                      </span>

                      <span>
                        Expires{" "}
                        {new Intl.DateTimeFormat(
                          "en-PH",
                          {
                            dateStyle:
                              "medium",
                          }
                        ).format(
                          new Date(
                            invitation.expires_at
                          )
                        )}
                      </span>
                    </div>
                  </div>

                  <form
                    action={
                      revokeInvitation
                    }
                  >
                    <input
                      type="hidden"
                      name="invitationId"
                      value={
                        invitation.id
                      }
                    />

                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <UserMinus className="size-3.5" />
                      Revoke
                    </button>
                  </form>
                </div>
              )
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Church Members
          </h2>

          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Administrators can change member roles at any time.
          </p>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {members.map(
            (member) => {
              const profile =
                profileMap.get(
                  member.user_id
                )

              const displayName =
                profile?.display_name?.trim() ||
                "Unnamed member"

              const isCurrentUser =
                member.user_id ===
                currentUserId

              return (
                <div
                  key={member.user_id}
                  className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                      {member.role ===
                      "admin" ? (
                        <ShieldCheck className="size-5" />
                      ) : (
                        <Users className="size-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {displayName}
                        </p>

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
                </div>
              )
            }
          )}

          {members.length ===
          0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto size-8 text-[var(--muted)]" />

              <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                No members found
              </p>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Invite your worship team to get started.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}