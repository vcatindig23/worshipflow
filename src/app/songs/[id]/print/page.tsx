import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import SongPrintSheet from "@/components/songs/song-print-sheet"
import { createClient } from "@/lib/supabase/server"

type PrintSongPageProps = {
  params: Promise<{ id: string }>
}

export default async function PrintSongPage({ params }: PrintSongPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) redirect("/login")

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) throw new Error("Unable to determine church membership.")
  if (!membership) redirect("/onboarding")

  const { data: song, error } = await supabase
    .from("songs")
    .select("id, organization_id, title, artist, current_key, tempo, time_signature, capo, chordpro_source, status")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
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
