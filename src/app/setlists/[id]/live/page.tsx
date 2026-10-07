import { notFound, redirect } from "next/navigation"
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

export default async function LiveStagePage({
  params,
}: LiveStagePageProps) {
  const { id } = await params
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const { data: setlist, error: setlistError } = await supabase
    .from("setlists")
    .select("id, name")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (setlistError) {
    redirect(`/error?code=setlists_load_failed`)
  }

  if (!setlist) {
    notFound()
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

  const stageSongs = buildLiveStageSongs(orderedSongs, charts)

  return (
    <LiveStageView
      setlistId={id}
      setlistName={setlist.name}
      songs={stageSongs}
    />
  )
}
