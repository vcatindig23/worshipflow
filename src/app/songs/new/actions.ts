"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  getChordProMetadata,
  validateChordPro,
} from "@/features/chordpro/parser"

const songSchema = z.object({
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

export async function createSong(formData: FormData) {
  const result = songSchema.safeParse({
    title: formData.get("title"),
    artist: formData.get("artist") ?? "",
    tempo: formData.get("tempo") ?? "",
    timeSignature: formData.get("timeSignature"),
    capo: formData.get("capo"),
    chordProSource: formData.get("chordProSource"),
    notes: formData.get("notes") ?? "",
  })

  if (!result.success) {
    redirect("/songs/new?error=invalid_details")
  }

  const chordProValidation = validateChordPro(
    result.data.chordProSource
  )

  if (!chordProValidation.valid) {
    redirect("/songs/new?error=invalid_chordpro")
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
    redirect("/songs/new?error=membership_failed")
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
    redirect("/songs/new?error=not_authorized")
  }

  const currentKey =
    getChordProMetadata(
      result.data.chordProSource,
      "key"
    ) ?? null

  const { data: song, error: songError } = await supabase
    .from("songs")
    .insert({
      organization_id: membership.organization_id,
      title: result.data.title,
      artist: result.data.artist || null,
      current_key: currentKey,
      original_key: currentKey,
      tempo:
        result.data.tempo === ""
          ? null
          : result.data.tempo,
      time_signature: result.data.timeSignature,
      capo: result.data.capo,
      chordpro_source: result.data.chordProSource,
      notes: result.data.notes || null,
      status: "active",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single()

  if (songError || !song) {
    redirect("/songs/new?error=create_failed")
  }

  redirect(`/songs/${song.id}`)
}