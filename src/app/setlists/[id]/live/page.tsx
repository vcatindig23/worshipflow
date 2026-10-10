import { notFound, redirect } from "next/navigation"
import { formatServiceTime } from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import LiveStageView from "@/components/setlists/live-stage-view"
import { buildLiveStageSongs } from "@/lib/live-stage"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type LiveStagePageProps = {
  params: Promise<{
    id: string
  }>
}

type SetlistSong = {
  song_id: string
  position: number
  section: string
  key_override: string | null
  capo_override: number | null
  tempo_override: number | null
  notes: string | null
}

type LiveTimelineItem = {
  id: string
  position: number
  item_type: string
  title: string
  duration_minutes: number | null
  notes: string | null
  song_id: string | null
}

type LiveTeamAssignment = {
  id: string
  user_id: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
  response_note: string | null
}

type LiveMemberProfile = {
  id: string
  display_name: string | null
}

type LiveServiceResource = {
  id: string
  display_name: string
  storage_path: string
}

function formatServiceDate(value: string | null) {
  if (!value) {
    return "No service date"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00`))
}

function formatStatus(value: "draft" | "published" | "archived") {
  if (value === "published") {
    return "Published"
  }

  if (value === "archived") {
    return "Archived"
  }

  return "Draft"
}

export default async function LiveStagePage({
  params,
}: LiveStagePageProps) {
  const { id } = await params
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const { data: rawSetlist, error: setlistError } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (setlistError) {
    redirect(`/error?code=setlists_load_failed`)
  }

  if (!rawSetlist) {
    notFound()
  }

  const setlist = {
    ...rawSetlist,
    description: rawSetlist.description ?? null,
    service_notes: rawSetlist.service_notes ?? null,
    announcements: rawSetlist.announcements ?? null,
    service_date: rawSetlist.service_date ?? null,
    service_time: serviceTimeAvailable
      ? rawSetlist.service_time ?? null
      : null,
  }

  const { data: setlistSongs, error: setlistSongsError } = await supabase
    .from("setlist_songs")
    .select(
      "song_id, position, section, key_override, capo_override, tempo_override, notes"
    )
    .eq("setlist_id", id)
    .order("position", { ascending: true })

  if (setlistSongsError) {
    redirect(`/setlists/${id}?error=setlist_load_failed`)
  }

  const orderedSongs = (setlistSongs ?? []) as SetlistSong[]
  const songIds = Array.from(new Set(orderedSongs.map((song) => song.song_id)))
  let charts: {
    id: string
    title: string
    artist: string | null
    current_key: string | null
    tempo: number | null
    capo: number | null
    chordpro_source: string
  }[] = []

  if (songIds.length > 0) {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist, current_key, tempo, capo, chordpro_source")
      .in("id", songIds)
      .eq("organization_id", workspace.organizationId)

    if (error) {
      redirect(`/setlists/${id}?error=setlist_load_failed`)
    }

    charts = data ?? []
  }


  const [
    timelineResult,
    teamAssignmentsResult,
    resourcesResult,
  ] = await Promise.all([
    supabase
      .from("setlist_timeline_items")
      .select(
        "id, position, item_type, title, duration_minutes, notes, song_id"
      )
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("position", { ascending: true }),
    supabase
      .from("setlist_team_assignments")
      .select(
        "id, user_id, team_position, confirmation_status, response_note"
      )
      .eq("setlist_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("setlist_resources")
      .select("id, display_name, storage_path")
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("created_at", { ascending: false }),
  ])

  const timeline =
    timelineResult.error
      ? []
      : ((timelineResult.data ?? []) as LiveTimelineItem[])

  const teamAssignments =
    teamAssignmentsResult.error
      ? []
      : ((teamAssignmentsResult.data ?? []) as LiveTeamAssignment[])

  const resourceRows =
    resourcesResult.error
      ? []
      : ((resourcesResult.data ?? []) as LiveServiceResource[])

  const profileIds = Array.from(
    new Set(teamAssignments.map((assignment) => assignment.user_id))
  )

  let profiles: LiveMemberProfile[] = []

  if (profileIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds)

    if (!profileError) {
      profiles = (profileData ?? []) as LiveMemberProfile[]
    }
  }

  const profileNamesById = new Map(
    profiles.map((profile) => [
      profile.id,
      profile.display_name?.trim() || "Name not set",
    ])
  )

  const team = teamAssignments.map((assignment) => ({
    id: assignment.id,
    display_name:
      profileNamesById.get(assignment.user_id) ?? "Name not set",
    team_position: assignment.team_position,
    confirmation_status: assignment.confirmation_status,
    response_note: assignment.response_note,
  }))

  const resources = (
    await Promise.all(
      resourceRows.map(async (resource) => {
        const { data, error } = await supabase.storage
          .from("workspace-files")
          .createSignedUrl(resource.storage_path, 3600)

        if (error || !data?.signedUrl) {
          return null
        }

        return {
          id: resource.id,
          display_name: resource.display_name,
          signed_url: data.signedUrl,
        }
      })
    )
  ).filter(
    (resource): resource is {
      id: string
      display_name: string
      signed_url: string
    } => resource !== null
  )

  const stageSongs = buildLiveStageSongs(orderedSongs, charts)

  return (
    <LiveStageView
      setlistId={id}
      setlistName={setlist.name}
      canManageCompletion={["admin", "worship_leader"].includes(workspace.role)}
      isServiceCompleted={Boolean(setlist.completed_at)}
      userId={workspace.userId}
      songs={stageSongs}
      serviceDate={formatServiceDate(setlist.service_date)}
      serviceTime={formatServiceTime(setlist.service_time) ?? ""}
      status={formatStatus(setlist.status)}
      description={setlist.description}
      serviceNotes={setlist.service_notes}
      announcements={setlist.announcements}
      timeline={timeline}
      team={team}
      resources={resources}
    />
  )
}
