"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  getChordProMetadata,
  validateChordPro,
} from "@/features/chordpro/parser"

const editSongSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  tempo: z.coerce.number().int().min(20).max(300).or(z.literal("")),
  timeSignature: z
    .string()
    .trim()
    .regex(/^[0-9]{1,2}\/[0-9]{1,2}$/),
  capo: z.coerce.number().int().min(0).max(12),
  chordProSource: z.string().max(500000),
  notes: z.string().max(10000),
})

export async function updateSong(formData: FormData) {
  const result = editSongSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    artist: formData.get("artist") ?? "",
    tempo: formData.get("tempo") ?? "",
    timeSignature: formData.get("timeSignature"),
    capo: formData.get("capo"),
    chordProSource: formData.get("chordProSource"),
    notes: formData.get("notes") ?? "",
  })

  if (!result.success) {
    const id = String(formData.get("id") ?? "")
    redirect(`/songs/${id}/edit?error=invalid_details`)
  }

  const validation = validateChordPro(
    result.data.chordProSource
  )

  if (!validation.valid) {
    redirect(`/songs/${result.data.id}/edit?error=invalid_chordpro`)
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

  if (membershipError) {
    redirect(`/songs/${result.data.id}/edit?error=membership_failed`)
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const allowedRoles = new Set([
    "admin",
    "worship_leader",
    "song_editor",
  ])

  if (!allowedRoles.has(membership.role)) {
    redirect(`/songs/${result.data.id}?error=not_authorized`)
  }

  const currentKey =
    getChordProMetadata(
      result.data.chordProSource,
      "key"
    ) ?? null

  const tempo =
    result.data.tempo === ""
      ? null
      : result.data.tempo

  const { error } = await supabase.rpc(
    "update_song_with_version",
    {
      p_song_id: result.data.id,
      p_title: result.data.title,
      p_artist: result.data.artist || null,
      p_tempo: tempo,
      p_time_signature: result.data.timeSignature,
      p_capo: result.data.capo,
      p_chordpro_source: result.data.chordProSource,
      p_notes: result.data.notes || null,
      p_current_key: currentKey,
    }
  )

  if (error) {
    redirect(`/songs/${result.data.id}/edit?error=update_failed`)
  }

  redirect(`/songs/${result.data.id}?saved=true`)
}