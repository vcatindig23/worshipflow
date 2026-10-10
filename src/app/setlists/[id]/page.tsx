import Link from "next/link"
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Edit,
  History,
  Music2,
  MonitorPlay,
  Trash2,
  Users,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import ProfileAvatar from "@/components/profile-avatar"
import PrintSetlistButton from "@/components/setlists/print-setlist-button"
import { createClient } from "@/lib/supabase/server"
import { formatServiceTime } from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { teamPositionLabels } from "@/lib/team-positions"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import ServiceResources from "./service-resources"
import ServiceTimeline from "./service-timeline"
import ServicePreparationChecklist from "./service-preparation-checklist"
import {
  addSongToSetlist,
  addSetlistTeamAssignment,
  deleteSetlist,
  moveSetlistSong,
  removeSongFromSetlist,
  removeSetlistTeamAssignment,
  setSetlistStatus,
  updateSetlistSong,
} from "../actions"

type SetlistPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Setlist = {
  id: string
  organization_id: string
  name: string
  description: string | null
  service_notes: string | null
  announcements: string | null
  service_date: string | null
  service_time: string | null
  status:
    | "draft"
    | "published"
    | "archived"
  created_at: string
  updated_at: string
  completed_at: string | null
  attendance_count: number | null
  actual_duration_minutes: number | null
  after_service_notes: string | null
}

type SetlistSong = {
  id: string
  song_id: string
  position: number
  section: string
  key_override: string | null
  capo_override: number | null
  tempo_override: number | null
  notes: string | null
}

type Song = {
  id: string
  title: string
  artist: string | null
  current_key: string | null
  tempo: number | null
  capo: number | null
  status: "active" | "archived"
}

type TeamMemberIdentity = {
  user_id: string
  team_positions: string[]
}

type TeamAssignment = {
  id: string
  user_id: string
  team_position: string
  confirmation_status:
    | "pending"
    | "confirmed"
    | "declined"
  responded_at: string | null
  response_note: string | null
}

type MemberProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

const editorRoles = [
  "admin",
  "worship_leader",
  "song_editor",
]

const leaderRoles = [
  "admin",
  "worship_leader",
]

const errorMessages: Record<
  string,
  string
> = {
  setlist_load_failed:
    "The setlist could not be loaded.",
  song_already_added:
    "That song is already in this setlist.",
  song_add_failed:
    "The song could not be added.",
  invalid_section:
    "The song section is invalid.",
  invalid_capo:
    "Capo must be between 0 and 12.",
  invalid_tempo:
    "BPM must be between 20 and 300.",
  notes_too_long:
    "Song notes are too long.",
  song_update_failed:
    "The song arrangement could not be updated.",
  song_move_failed:
    "The song could not be moved.",
  song_remove_failed:
    "The song could not be removed.",
  invalid_status:
    "The setlist status is invalid.",
  status_update_failed:
    "The setlist status could not be updated.",
  delete_failed:
    "The setlist could not be deleted.",
  invalid_team_assignment:
    "Select a valid worship-team member and position.",
  team_member_not_found:
    "That person is not a member of this church workspace.",
  team_position_not_assigned:
    "That member does not have this worship-team position assigned on the Team page.",
  team_assignment_exists:
    "That member is already assigned to this setlist for that position.",
  team_assignment_migration_missing:
    "The setlist assignment database migration is missing or not yet visible to Supabase. Apply the setlist-team-assignment migration and refresh the API schema cache.",
  team_assignment_failed:
    "The team assignment could not be changed.",
  invalid_resource:
    "Select a valid workspace file and display name.",
  resource_permission_denied:
    "You do not have permission to manage service resources.",
  resource_file_not_found:
    "That workspace file could not be found.",
  resource_already_added:
    "That file is already linked to this service.",
  resource_add_failed:
    "The service resource could not be added.",
  resource_remove_failed:
    "The service resource could not be removed.",
  timeline_invalid_title:
    "Timeline item title is required and must be 160 characters or fewer.",
  timeline_invalid_type:
    "The timeline item type is invalid.",
  timeline_invalid_duration:
    "Timeline duration must be between 1 and 240 minutes.",
  timeline_invalid_song:
    "The selected timeline song must already be part of this service.",
  timeline_notes_too_long:
    "Timeline notes are too long.",
  timeline_add_failed:
    "The timeline item could not be added.",
  timeline_remove_failed:
    "The timeline item could not be removed.",
  timeline_invalid_direction:
    "The timeline item movement is invalid.",
  timeline_move_failed:
    "The timeline item could not be moved.",
  completion_failed:
    "The service completion update could not be saved.",
}

function formatDate(value: string | null) {
  if (!value) {
    return "No service date"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00`))
}

function statusLabel(
  status: Setlist["status"]
) {
  if (status === "published") {
    return "Published"
  }

  if (status === "archived") {
    return "Archived"
  }

  return "Draft"
}

export default async function SetlistPage({
  params,
  searchParams,
}: SetlistPageProps) {
  const { id } = await params
  const queryParams = await searchParams

  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const [
    setlistResult,
    setlistSongsResult,
    songsResult,
  ] = await Promise.all([
    supabase
      .from("setlists")
      .select("*")
      .eq("id", id)
      .eq(
        "organization_id",
        workspace.organizationId
      )
      .maybeSingle(),

    supabase
      .from("setlist_songs")
      .select(
        "id, song_id, position, section, key_override, capo_override, tempo_override, notes"
      )
      .eq("setlist_id", id)
      .order("position", {
        ascending: true,
      }),

    supabase
      .from("songs")
      .select(
        "id, title, artist, current_key, tempo, capo, status"
      )
      .eq(
        "organization_id",
        workspace.organizationId
      )
      .eq("status", "active")
      .order("title", {
        ascending: true,
      }),
  ])

  if (setlistResult.error) {
    redirect(
      `/setlists/${id}?error=setlist_load_failed`
    )
  }

  if (
    setlistSongsResult.error ||
    songsResult.error
  ) {
    redirect(
      `/setlists/${id}?error=setlist_load_failed`
    )
  }

  if (!setlistResult.data) {
    notFound()
  }

  const setlist = {
    ...setlistResult.data,
    service_time: serviceTimeAvailable
      ? setlistResult.data.service_time
      : null,
  } as Setlist

  const setlistSongs =
    (setlistSongsResult.data ??
      []) as SetlistSong[]

  const availableSongs =
    (songsResult.data ?? []) as Song[]

  const songIds = setlistSongs.map(
    (item) => item.song_id
  )

  let songDetails: Song[] = []

  if (songIds.length > 0) {
    const { data, error } = await supabase
      .from("songs")
      .select(
        "id, title, artist, current_key, tempo, capo, status"
      )
      .in("id", songIds)
      .eq(
        "organization_id",
        workspace.organizationId
      )

    if (error) {
      redirect(
        `/setlists/${id}?error=setlist_load_failed`
      )
    }

    songDetails = (data ?? []) as Song[]
  }

  const songsById = new Map(
    songDetails.map((song) => [
      song.id,
      song,
    ])
  )

  const songsAlreadyAdded =
    new Set(songIds)

  const songsToAdd = availableSongs.filter(
    (song) =>
      !songsAlreadyAdded.has(song.id)
  )

  const canEdit = editorRoles.includes(
    workspace.role
  )

  const canManageStatus =
    leaderRoles.includes(workspace.role)

  const [
    teamMembersResult,
    teamAssignmentsResult,
    timelineCountResult,
    resourcesCountResult,
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, team_positions")
      .eq("organization_id", workspace.organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("setlist_team_assignments")
      .select(
        "id, user_id, team_position, confirmation_status, responded_at, response_note"
      )
      .eq("setlist_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("setlist_timeline_items")
      .select("id", { count: "exact", head: true })
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId),
    supabase
      .from("setlist_resources")
      .select("id", { count: "exact", head: true })
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId),
  ])

  const teamDataAvailable =
    !teamMembersResult.error &&
    !teamAssignmentsResult.error
  const teamMemberIdentities = (
    teamMembersResult.data ?? []
  ) as TeamMemberIdentity[]
  const teamAssignments = (
    teamAssignmentsResult.data ?? []
  ) as TeamAssignment[]
  const timelineCount = timelineCountResult.error
    ? null
    : timelineCountResult.count ?? 0
  const resourceCount = resourcesCountResult.error
    ? null
    : resourcesCountResult.count ?? 0

  const profileIds = Array.from(
    new Set([
      ...teamMemberIdentities.map((member) => member.user_id),
      ...teamAssignments.map((assignment) => assignment.user_id),
    ])
  )
  let teamProfiles: MemberProfile[] = []

  if (profileIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", profileIds)

    if (error) {
      redirect(`/setlists/${id}?error=setlist_load_failed`)
    }

    teamProfiles = (data ?? []) as MemberProfile[]
  }

  const teamAvatarUrls = await getProfileAvatarUrlMap(
    supabase,
    teamProfiles.map((profile) => profile.avatar_url)
  )
  const teamProfilesById = new Map(
    teamProfiles.map((profile) => [profile.id, profile])
  )
  const teamProfileNames = new Map(
    teamProfiles.map((profile) => [
      profile.id,
      profile.display_name?.trim() || "Name not set",
    ])
  )
  const existingAssignmentKeys = new Set(
    teamAssignments.map(
      (assignment) =>
        `${assignment.user_id}|${assignment.team_position}`
    )
  )
  const teamPositions = Object.keys(teamPositionLabels)
  const hasConfiguredTeamPosition = teamMemberIdentities.some((member) =>
    (member.team_positions ?? []).some((position) =>
      teamPositions.includes(position)
    )
  )
  const assignableOptions = teamMemberIdentities.flatMap((member) =>
    (member.team_positions ?? [])
      .filter((position) => teamPositions.includes(position))
      .map((position) => ({
        key: `${member.user_id}|${position}`,
        label: `${teamProfileNames.get(member.user_id) ?? "Name not set"} — ${
          teamPositionLabels[position] ?? position
        }`,
      }))
  ).filter((option) => !existingAssignmentKeys.has(option.key))

  const confirmedAssignments = teamAssignments.filter(
    (assignment) => assignment.confirmation_status === "confirmed"
  ).length

  const pendingAssignments = teamAssignments.filter(
    (assignment) => assignment.confirmation_status === "pending"
  ).length

  const declinedAssignments = teamAssignments.filter(
    (assignment) => assignment.confirmation_status === "declined"
  ).length

  const errorKey =
    typeof queryParams.error === "string"
      ? queryParams.error
      : ""

  const errorMessage =
    errorKey
      ? errorMessages[errorKey] ??
        "The requested action could not be completed."
      : ""

  return (
    <main className="setlist-print-layout mx-auto max-w-7xl space-y-7 px-6 py-8">
      <Link
        href="/setlists"
        className="setlist-print-hide inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Setlists
      </Link>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!teamDataAvailable ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
        >
          Worship-team assignments are unavailable until the member-position
          and setlist-assignment database migrations have been applied. Your
          setlist and songs remain available.
        </div>
      ) : null}

      <section className="setlist-print-header rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
                <BookOpen className="size-3.5" />
                Setlist
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  setlist.status ===
                  "published"
                    ? "bg-emerald-100 text-emerald-800"
                    : setlist.status ===
                        "archived"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                {statusLabel(
                  setlist.status
                )}
              </span>

              {setlist.completed_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3.5" />
                  Completed
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
              {setlist.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="size-4" />
                {formatDate(
                  setlist.service_date
                )}
                {formatServiceTime(setlist.service_time)
                  ? ` · ${formatServiceTime(setlist.service_time)}`
                  : ""}
              </span>

              <span>
                {setlistSongs.length}{" "}
                {setlistSongs.length === 1
                  ? "song"
                  : "songs"}
              </span>
            </div>

            {setlist.description ? (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {setlist.description}
              </p>
            ) : null}
          </div>

          <div className="setlist-print-actions flex flex-wrap gap-2">
            {canManageStatus ? (
              <Link
                href={`/setlists/${id}/complete`}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  setlist.completed_at
                    ? "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"
                    : "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]"
                }`}
              >
                {setlist.completed_at ? (
                  <History className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {setlist.completed_at
                  ? "Service History"
                  : "Complete Service"}
              </Link>
            ) : null}

            {setlistSongs.length > 0 ? (
              <Link
                href={`/setlists/${id}/live`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                <MonitorPlay className="size-4" />
                Live Stage
              </Link>
            ) : null}

            <PrintSetlistButton />

            {canEdit ? (
              <Link
                href={`/setlists/${id}/edit`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                <Edit className="size-4" />
                Edit
              </Link>
            ) : null}

            {canManageStatus &&
            setlist.status !==
              "archived" ? (
              <form action={setSetlistStatus}>
                <input
                  type="hidden"
                  name="setlistId"
                  value={id}
                />

                <input
                  type="hidden"
                  name="status"
                  value={
                    setlist.status ===
                    "draft"
                      ? "published"
                      : "archived"
                  }
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  {setlist.status ===
                  "draft" ? (
                    "Publish"
                  ) : (
                    <>
                      <Archive className="size-4" />
                      Archive
                    </>
                  )}
                </button>
              </form>
            ) : null}

            {canManageStatus &&
            setlist.status ===
              "archived" ? (
              <form action={setSetlistStatus}>
                <input
                  type="hidden"
                  name="setlistId"
                  value={id}
                />

                <input
                  type="hidden"
                  name="status"
                  value="draft"
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Restore
                </button>
              </form>
            ) : null}

            {canManageStatus ? (
              <form action={deleteSetlist}>
                <input
                  type="hidden"
                  name="setlistId"
                  value={id}
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <ServicePreparationChecklist
        setlistId={id}
        serviceDate={setlist.service_date}
        serviceTime={setlist.service_time}
        songCount={setlistSongs.length}
        teamAssignments={teamAssignments}
        timelineCount={timelineCount}
        resourceCount={resourceCount}
        hasServiceNotes={Boolean(setlist.service_notes)}
        hasAnnouncements={Boolean(setlist.announcements)}
        canEdit={canEdit}
        isCompleted={Boolean(setlist.completed_at)}
      />

      {(setlist.announcements || setlist.service_notes) ? (
        <section
          id="service-notes"
          className="scroll-mt-6 grid gap-4 md:grid-cols-2"
        >
          {setlist.announcements ? (
            <article className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Service Announcements
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                {setlist.announcements}
              </p>
            </article>
          ) : null}

          {setlist.service_notes ? (
            <article className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Service Notes
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                {setlist.service_notes}
              </p>
            </article>
          ) : null}
        </section>
      ) : null}

      <ServiceTimeline setlistId={id} canEdit={canEdit} />

      <div className="setlist-print-content grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section id="worship-order" className="scroll-mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Worship Order
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              Arrange songs and configure each song for this service.
            </p>
          </div>

          {setlistSongs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center shadow-sm">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Music2 className="size-5" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                No songs in this setlist
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                Choose songs from your church&apos;s catalog using the
                Add Song panel.
              </p>
            </div>
          ) : (
            setlistSongs.map(
              (setlistSong, index) => {
                const song =
                  songsById.get(
                    setlistSong.song_id
                  )

                if (!song) {
                  return null
                }

                const key =
                  setlistSong.key_override ??
                  song.current_key ??
                  ""

                const capo =
                  setlistSong.capo_override ??
                  song.capo

                const tempo =
                  setlistSong.tempo_override ??
                  song.tempo

                return (
                  <article
                    key={setlistSong.id}
                    className="setlist-song-card rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[var(--foreground)]">
                              {song.title}
                            </h3>

                            {song.status ===
                            "archived" ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                Song archived
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {song.artist ||
                              "Unknown artist"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {key ? (
                              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                                Key {key}
                              </span>
                            ) : null}

                            {capo !== null ? (
                              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                                Capo {capo}
                              </span>
                            ) : null}

                            {tempo ? (
                              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                                {tempo} BPM
                              </span>
                            ) : null}

                            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                              {setlistSong.section}
                            </span>
                          </div>
                        </div>

                        {canEdit ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <form
                              action={
                                moveSetlistSong
                              }
                            >
                              <input
                                type="hidden"
                                name="setlistSongId"
                                value={
                                  setlistSong.id
                                }
                              />

                              <input
                                type="hidden"
                                name="setlistId"
                                value={id}
                              />

                              <input
                                type="hidden"
                                name="direction"
                                value="up"
                              />

                              <button
                                type="submit"
                                disabled={
                                  index === 0
                                }
                                aria-label={`Move ${song.title} up`}
                                className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowUp className="size-4" />
                              </button>
                            </form>

                            <form
                              action={
                                moveSetlistSong
                              }
                            >
                              <input
                                type="hidden"
                                name="setlistSongId"
                                value={
                                  setlistSong.id
                                }
                              />

                              <input
                                type="hidden"
                                name="setlistId"
                                value={id}
                              />

                              <input
                                type="hidden"
                                name="direction"
                                value="down"
                              />

                              <button
                                type="submit"
                                disabled={
                                  index ===
                                  setlistSongs.length -
                                    1
                                }
                                aria-label={`Move ${song.title} down`}
                                className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <ArrowDown className="size-4" />
                              </button>
                            </form>

                            <form
                              action={
                                removeSongFromSetlist
                              }
                            >
                              <input
                                type="hidden"
                                name="setlistSongId"
                                value={
                                  setlistSong.id
                                }
                              />

                              <input
                                type="hidden"
                                name="setlistId"
                                value={id}
                              />

                              <button
                                type="submit"
                                aria-label={`Remove ${song.title}`}
                                className="flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>

                      {canEdit ? (
                        <form
                          action={
                            updateSetlistSong
                          }
                          className="grid gap-4 rounded-2xl bg-[var(--surface)] p-4 md:grid-cols-2 xl:grid-cols-4"
                        >
                          <input
                            type="hidden"
                            name="setlistSongId"
                            value={
                              setlistSong.id
                            }
                          />

                          <input
                            type="hidden"
                            name="setlistId"
                            value={id}
                          />

                          <div>
                            <label
                              htmlFor={`section-${setlistSong.id}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                            >
                              Section
                            </label>

                            <input
                              id={`section-${setlistSong.id}`}
                              name="section"
                              defaultValue={
                                setlistSong.section
                              }
                              maxLength={80}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`key-${setlistSong.id}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                            >
                              Key Override
                            </label>

                            <input
                              id={`key-${setlistSong.id}`}
                              name="keyOverride"
                              defaultValue={
                                setlistSong.key_override ??
                                ""
                              }
                              maxLength={20}
                              placeholder={
                                song.current_key ??
                                "Original"
                              }
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`capo-${setlistSong.id}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                            >
                              Capo
                            </label>

                            <input
                              id={`capo-${setlistSong.id}`}
                              name="capoOverride"
                              type="number"
                              min={0}
                              max={12}
                              defaultValue={
                                setlistSong.capo_override ??
                                ""
                              }
                              placeholder={
                                song.capo !== null
                                  ? String(
                                      song.capo
                                    )
                                  : "None"
                              }
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`tempo-${setlistSong.id}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                            >
                              BPM
                            </label>

                            <input
                              id={`tempo-${setlistSong.id}`}
                              name="tempoOverride"
                              type="number"
                              min={20}
                              max={300}
                              defaultValue={
                                setlistSong.tempo_override ??
                                ""
                              }
                              placeholder={
                                song.tempo !== null
                                  ? String(
                                      song.tempo
                                    )
                                  : "Original"
                              }
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                            />
                          </div>

                          <div className="md:col-span-2 xl:col-span-4">
                            <label
                              htmlFor={`notes-${setlistSong.id}`}
                              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                            >
                              Arrangement Notes
                            </label>

                            <textarea
                              id={`notes-${setlistSong.id}`}
                              name="notes"
                              maxLength={2000}
                              rows={2}
                              defaultValue={
                                setlistSong.notes ??
                                ""
                              }
                              placeholder="Intro, transition, repeat chorus, spoken prayer, etc."
                              className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[var(--brand)]"
                            />
                          </div>

                          <div className="md:col-span-2 xl:col-span-4">
                            <button
                              type="submit"
                              className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                            >
                              Save Arrangement
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {!canEdit &&
                      setlistSong.notes ? (
                        <div className="setlist-print-hide rounded-2xl bg-[var(--surface)] p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                            Arrangement Notes
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                            {setlistSong.notes}
                          </p>
                        </div>
                      ) : null}

                      {setlistSong.notes ? (
                        <div className="setlist-print-notes hidden">
                          <p className="text-xs font-semibold uppercase tracking-wide">
                            Arrangement Notes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                            {setlistSong.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              }
            )
          )}
        </section>

        <section className="setlist-print-team hidden">
          <h2 className="text-lg font-semibold">Worship Team</h2>
          {teamAssignments.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2">
              {teamAssignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex justify-between gap-4 border-b border-gray-200 py-2"
                >
                  <span>{teamProfileNames.get(assignment.user_id) ?? "Name not set"}</span>
                  <span className="text-right">
                    {teamPositionLabels[assignment.team_position] ??
                      assignment.team_position}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm">No worship team members are assigned yet.</p>
          )}
        </section>

        <aside className="setlist-print-sidebar space-y-5">
          <ServiceResources setlistId={id} canEdit={canEdit} />

          <section id="worship-team" className="scroll-mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[var(--brand)]" />
              <h2 className="font-semibold text-[var(--foreground)]">
                Worship Team
              </h2>
            </div>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Assign members to the positions set for them on the Team page.
            </p>

            {teamAssignments.length > 0 ? (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                    <p className="text-lg font-bold text-emerald-700">
                      {confirmedAssignments}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Confirmed
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                    <p className="text-lg font-bold text-amber-700">
                      {pendingAssignments}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      Pending
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 px-3 py-2.5">
                    <p className="text-lg font-bold text-rose-700">
                      {declinedAssignments}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                      Declined
                    </p>
                  </div>
                </div>
                <ul className="mt-4 divide-y divide-[var(--border)]">
                  {teamAssignments.map((assignment) => (
                    <li key={assignment.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProfileAvatar
                            name={teamProfileNames.get(assignment.user_id) ?? "Name not set"}
                            imageUrl={
                              teamAvatarUrls.get(
                                teamProfilesById.get(assignment.user_id)?.avatar_url ?? ""
                              ) ?? null
                            }
                            sizeClassName="size-9"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">
                              {teamProfileNames.get(assignment.user_id) ?? "Name not set"}
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              {teamPositionLabels[assignment.team_position] ?? assignment.team_position}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              assignment.confirmation_status === "confirmed"
                                ? "bg-emerald-50 text-emerald-700"
                                : assignment.confirmation_status === "declined"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {assignment.confirmation_status === "confirmed"
                              ? "Confirmed"
                              : assignment.confirmation_status === "declined"
                                ? "Declined"
                                : "Pending"}
                          </span>
                          {canEdit ? (
                            <form action={removeSetlistTeamAssignment}>
                              <input type="hidden" name="setlistId" value={id} />
                              <input type="hidden" name="assignmentId" value={assignment.id} />
                              <button
                                type="submit"
                                aria-label={`Remove ${teamProfileNames.get(assignment.user_id) ?? "member"} from setlist`}
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      {assignment.response_note ? (
                        <p className="mt-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                          {assignment.response_note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 rounded-xl bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                No worship team members are assigned yet.
              </p>
            )}
            {canEdit && teamDataAvailable ? (
              assignableOptions.length > 0 ? (
                <form
                  action={addSetlistTeamAssignment}
                  className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"
                >
                  <input
                    type="hidden"
                    name="setlistId"
                    value={id}
                  />
                  <label
                    htmlFor="assignmentKey"
                    className="block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                  >
                    Member and position
                  </label>
                  <select
                    id="assignmentKey"
                    name="assignmentKey"
                    required
                    defaultValue=""
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                  >
                    <option value="" disabled>
                      Select a team member
                    </option>
                    {assignableOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="h-10 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    Assign to Service
                  </button>
                </form>
              ) : !hasConfiguredTeamPosition ? (
                <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--muted)]">
                  Assign worship-team positions to members on the Team page before scheduling them here.
                </p>
              ) : (
                <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
                  All assigned member positions are already on this service.
                </p>
              )
            ) : null}
          </section>

          {canEdit ? (
            <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Music2 className="size-4 text-[var(--brand)]" />

                  <h2 className="font-semibold text-[var(--foreground)]">
                    Add Song
                  </h2>
                </div>

                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Add a song from your church&apos;s active catalog.
                </p>
              </div>

              {songsToAdd.length ===
              0 ? (
                <div className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
                  All active songs are already in this setlist.
                </div>
              ) : (
                <form
                  action={addSongToSetlist}
                  className="mt-5 space-y-4"
                >
                  <input
                    type="hidden"
                    name="setlistId"
                    value={id}
                  />

                  <div>
                    <label
                      htmlFor="songId"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                    >
                      Song
                    </label>

                    <select
                      id="songId"
                      name="songId"
                      required
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                    >
                      <option value="">
                        Select a song
                      </option>

                      {songsToAdd.map(
                        (song) => (
                          <option
                            key={song.id}
                            value={song.id}
                          >
                            {song.title}
                            {song.artist
                              ? ` — ${song.artist}`
                              : ""}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="section"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                    >
                      Section
                    </label>

                    <input
                      id="section"
                      name="section"
                      defaultValue="Worship"
                      maxLength={80}
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="keyOverride"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                      >
                        Key
                      </label>

                      <input
                        id="keyOverride"
                        name="keyOverride"
                        maxLength={20}
                        placeholder="Song key"
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="capoOverride"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                      >
                        Capo
                      </label>

                      <input
                        id="capoOverride"
                        name="capoOverride"
                        type="number"
                        min={0}
                        max={12}
                        placeholder="Optional"
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tempoOverride"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                    >
                      BPM
                    </label>

                    <input
                      id="tempoOverride"
                      name="tempoOverride"
                      type="number"
                      min={20}
                      max={300}
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                    >
                      Notes
                    </label>

                    <textarea
                      id="notes"
                      name="notes"
                      maxLength={2000}
                      rows={3}
                      placeholder="Optional arrangement notes"
                      className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[var(--brand)]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    Add to Setlist
                  </button>
                </form>
              )}
            </section>
          ) : null}

          <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--foreground)]">
              Setlist Summary
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--muted)]">
                  Songs
                </dt>

                <dd className="font-semibold text-[var(--foreground)]">
                  {setlistSongs.length}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--muted)]">
                  Status
                </dt>

                <dd className="font-semibold text-[var(--foreground)]">
                  {statusLabel(
                    setlist.status
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-[var(--muted)]">
                  Service time
                </dt>

                <dd className="text-right font-medium text-[var(--foreground)]">
                  {formatServiceTime(setlist.service_time) ??
                    "Not set"}
                </dd>
              </div>
              {setlist.completed_at ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-[var(--muted)]">
                    Attendance
                  </dt>
                  <dd className="font-medium text-[var(--foreground)]">
                    {setlist.attendance_count === null
                      ? "Not recorded"
                      : setlist.attendance_count.toLocaleString("en-PH")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <Link
            href="/songs"
            className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:bg-[var(--surface)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <Music2 className="size-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Song Library
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  Manage your church songs
                </p>
              </div>
            </div>

            <ChevronRight className="size-4 text-[var(--muted)]" />
          </Link>
        </aside>
      </div>
    </main>
  )
}