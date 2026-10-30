import type { Metadata } from "next"
import { notFound } from "next/navigation"
import SongPrintSheet from "@/components/songs/song-print-sheet"
import { getWorkspaceIdentity } from "@/lib/workspace/get-workspace-identity"

type PrintSongPageProps = {
  params: Promise<{ id: string }>
}

export default async function PrintSongPage({ params }: PrintSongPageProps) {
  const { id } = await params
  const workspace = await getWorkspaceIdentity()
  const supabase = workspace.supabase

  const { data: song, error } = await supabase
    .from("songs")
    .select("id, organization_id, title, artist, current_key, tempo, time_signature, capo, chordpro_source, status")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .eq("status", "active")
    .maybeSingle()

  if (error) throw new Error("Unable to load the song for printing.")
  if (!song) notFound()

  return (
    <SongPrintSheet
      source={song.chordpro_source}
      title={song.title}
      artist={song.artist}
      currentKey={song.current_key}
      tempo={song.tempo}
      timeSignature={song.time_signature}
      capo={song.capo}
    />
  )
}


export const metadata: Metadata = { title: "Print song chart" }
