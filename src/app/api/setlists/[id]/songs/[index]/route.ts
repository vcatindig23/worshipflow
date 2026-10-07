import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const uuidSchema = z.string().uuid()
const indexSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .refine(Number.isSafeInteger)
  .refine((index) => index >= 0)

type LiveSongRouteProps = {
  params: Promise<{
    id: string
    index: string
  }>
}

export async function GET(
  _request: Request,
  { params }: LiveSongRouteProps
) {
  const { id, index: indexValue } = await params
  const indexResult = indexSchema.safeParse(indexValue)

  if (
    !uuidSchema.safeParse(id).success ||
    !indexResult.success
  ) {
    return Response.json(
      { error: "Invalid service or song index." },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 }
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) {
    return Response.json(
      { error: "Unable to verify service access." },
      { status: 500 }
    )
  }

  if (!membership) {
    return Response.json(
      { error: "Service not found." },
      { status: 404 }
    )
  }

  const { data: setlist, error: setlistError } = await supabase
    .from("setlists")
    .select("id")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (setlistError) {
    return Response.json(
      { error: "Unable to load service." },
      { status: 500 }
    )
  }

  if (!setlist) {
    return Response.json(
      { error: "Service not found." },
      { status: 404 }
    )
  }

  const { data: setlistSong, error: setlistSongError } = await supabase
    .from("setlist_songs")
    .select("song_id, position, section, key_override, capo_override, tempo_override, notes")
    .eq("setlist_id", id)
    .order("position", { ascending: true })
    .range(indexResult.data, indexResult.data)
    .maybeSingle()

  if (setlistSongError) {
    return Response.json(
      { error: "Unable to load song from service." },
      { status: 500 }
    )
  }

  if (!setlistSong) {
    return Response.json(
      { error: "Song not found in service." },
      { status: 404 }
    )
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select("id, title, artist, current_key, tempo, capo, chordpro_source")
    .eq("id", setlistSong.song_id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (songError) {
    return Response.json(
      { error: "Unable to load song chart." },
      { status: 500 }
    )
  }

  if (!song) {
    return Response.json(
      { error: "Song chart is unavailable." },
      { status: 404 }
    )
  }

  return Response.json(
    {
      title: song.title,
      artist: song.artist,
      source: song.chordpro_source,
      section: setlistSong.section,
      key: setlistSong.key_override ?? song.current_key,
      capo: setlistSong.capo_override ?? song.capo,
      tempo: setlistSong.tempo_override ?? song.tempo,
      notes: setlistSong.notes,
      position: setlistSong.position,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  )
}
