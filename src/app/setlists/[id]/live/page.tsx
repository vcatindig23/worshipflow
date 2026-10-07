import { notFound, redirect } from "next/navigation"
import LiveStageView from "@/components/setlists/live-stage-view"
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
}

type Song = {
  id: string
  title: string
  artist: string | null
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
    .select("song_id, position")
    .eq("setlist_id", id)
    .order("position", { ascending: true })

  if (setlistSongsError) {
    redirect(`/setlists/${id}?error=setlist_load_failed`)
  }

  const orderedSongs = (setlistSongs ?? []) as SetlistSong[]
  const songIds = Array.from(new Set(orderedSongs.map((song) => song.song_id)))
  let songs: Song[] = []

  if (songIds.length > 0) {
    const { data, error } = await supabase
      .from("songs")
      .select("id, title, artist")
      .in("id", songIds)
      .eq("organization_id", workspace.organizationId)

    if (error) {
      redirect(`/setlists/${id}?error=setlist_load_failed`)
    }

    songs = (data ?? []) as Song[]
  }

  const songsById = new Map(songs.map((song) => [song.id, song]))
  const stageSongs = orderedSongs.map((setlistSong) => {
    const song = songsById.get(setlistSong.song_id)

    return {
      id: setlistSong.song_id,
      title: song?.title ?? "Song unavailable",
      artist: song?.artist ?? null,
    }
  })

  return (
    <LiveStageView
      setlistId={id}
      setlistName={setlist.name}
      songs={stageSongs}
    />
  )
}
