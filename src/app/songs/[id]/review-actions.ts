"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const commentSchema = z.object({
  songId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
})
const statusSchema = z.object({
  songId: z.string().uuid(),
  status: z.enum(["draft", "in_review", "changes_requested", "approved"]),
})
const editorRoles = new Set(["admin", "worship_leader", "song_editor"])

type ActionResult = { ok: true } | { ok: false; error: string }

async function getSongReviewContext(songId: string) {
  const supabase = await createClient()
  const { data: claims, error: claimsError } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (claimsError || !userId) return { ok: false as const, error: "Please sign in again to continue." }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError || !membership) {
    return { ok: false as const, error: "Your team membership could not be verified." }
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select("id")
    .eq("id", songId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (songError || !song) return { ok: false as const, error: "This song was not found in your workspace." }

  return {
    ok: true as const,
    supabase,
    userId,
    organizationId: membership.organization_id,
    role: membership.role,
  }
}

async function ensureReviewThread(
  context: Extract<Awaited<ReturnType<typeof getSongReviewContext>>, { ok: true }>,
  songId: string,
) {
  const { data: existing, error: selectError } = await context.supabase
    .from("song_review_threads")
    .select("id")
    .eq("song_id", songId)
    .eq("organization_id", context.organizationId)
    .maybeSingle()

  if (selectError) return { id: null, error: "The song review thread could not be loaded." }
  if (existing?.id) return { id: existing.id as string, error: null }

  const { data: inserted, error: insertError } = await context.supabase
    .from("song_review_threads")
    .insert({
      song_id: songId,
      organization_id: context.organizationId,
      requested_by: context.userId,
      updated_by: context.userId,
      status: "draft",
    })
    .select("id")
    .maybeSingle()

  if (!insertError && inserted?.id) return { id: inserted.id as string, error: null }

  const { data: raced } = await context.supabase
    .from("song_review_threads")
    .select("id")
    .eq("song_id", songId)
    .eq("organization_id", context.organizationId)
    .maybeSingle()

  return raced?.id
    ? { id: raced.id as string, error: null }
    : { id: null, error: "The review thread could not be started. Please try again." }
}

export async function postSongReviewComment(songId: string, body: string): Promise<ActionResult> {
  const parsed = commentSchema.safeParse({ songId, body })
  if (!parsed.success) return { ok: false, error: "Write a comment of up to 5,000 characters." }

  const context = await getSongReviewContext(parsed.data.songId)
  if (!context.ok) return context

  const thread = await ensureReviewThread(context, parsed.data.songId)
  if (!thread.id) return { ok: false, error: thread.error ?? "The review thread could not be started." }

  const { error } = await context.supabase
    .from("song_review_comments")
    .insert({
      thread_id: thread.id,
      song_id: parsed.data.songId,
      organization_id: context.organizationId,
      user_id: context.userId,
      body: parsed.data.body,
    })

  if (error) {
    console.error("post_song_review_comment failed:", { code: error.code })
    return { ok: false, error: "Your comment could not be saved. Please try again." }
  }

  revalidatePath("/songs/" + parsed.data.songId)
  revalidatePath("/notifications")
  revalidatePath("/")
  return { ok: true }
}

export async function setSongReviewStatus(songId: string, status: string): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ songId, status })
  if (!parsed.success) return { ok: false, error: "Choose a valid review status." }

  const context = await getSongReviewContext(parsed.data.songId)
  if (!context.ok) return context

  const isEditor = editorRoles.has(context.role)
  if (parsed.data.status !== "in_review" && !isEditor) {
    return { ok: false, error: "Only worship leaders and song editors can change this review status." }
  }

  const { data: existing, error: existingError } = await context.supabase
    .from("song_review_threads")
    .select("id, status")
    .eq("song_id", parsed.data.songId)
    .eq("organization_id", context.organizationId)
    .maybeSingle()

  if (existingError) return { ok: false, error: "The review status could not be loaded." }
  if (!isEditor && existing && existing.status !== "draft") {
    return { ok: false, error: "Only a draft song can be sent for review." }
  }

  if (!existing?.id && parsed.data.status === "in_review") {
    const { error: insertError } = await context.supabase
      .from("song_review_threads")
      .insert({
        song_id: parsed.data.songId,
        organization_id: context.organizationId,
        requested_by: context.userId,
        updated_by: context.userId,
        status: "in_review",
      })

    if (insertError) {
      console.error("request_song_review failed:", { code: insertError.code })
      return { ok: false, error: "The review request could not be saved. Please try again." }
    }

    revalidatePath("/songs/" + parsed.data.songId)
    revalidatePath("/notifications")
    revalidatePath("/")
    return { ok: true }
  }

  const thread = await ensureReviewThread(context, parsed.data.songId)
  if (!thread.id) return { ok: false, error: thread.error ?? "The review thread could not be started." }

  const { error } = await context.supabase
    .from("song_review_threads")
    .update({
      status: parsed.data.status,
      updated_by: context.userId,
      reviewed_by: parsed.data.status === "approved" || parsed.data.status === "changes_requested"
        ? context.userId
        : null,
    })
    .eq("id", thread.id)
    .eq("organization_id", context.organizationId)

  if (error) {
    console.error("set_song_review_status failed:", { code: error.code })
    return { ok: false, error: "The review status could not be updated. Please try again." }
  }

  revalidatePath("/songs/" + parsed.data.songId)
  revalidatePath("/notifications")
  revalidatePath("/")
  return { ok: true }
}
