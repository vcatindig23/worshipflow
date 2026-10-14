"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  normalizeGlobalSearchQuery,
  toSearchPattern,
} from "@/lib/global-search"

const liveSearchSchema = z.string().trim().max(100)

type LiveSearchSong = {
  id: string
  title: string
  artist: string | null
  album: string | null
  status: "active" | "archived"
}

type LiveSearchSetlist = {
  id: string
  name: string
  service_date: string | null
  status: "draft" | "published" | "archived"
}

async function getSearchContext() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    console.error("load_global_search_membership failed:", {
      code: membershipError.code,
    })
    throw new Error("Unable to load your search workspace.")
  }

  if (!membership?.organization_id) {
    redirect("/onboarding")
  }

  return {
    supabase,
    organizationId: membership.organization_id,
  }
}

export async function searchWorkspaceLive(rawQuery: string) {
  const parsed = liveSearchSchema.safeParse(rawQuery)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Search terms must be 100 characters or fewer.",
    }
  }

  const query = normalizeGlobalSearchQuery(parsed.data)

  if (query.length < 2) {
    return {
      success: true as const,
      songs: [] as LiveSearchSong[],
      setlists: [] as LiveSearchSetlist[],
    }
  }

  const { supabase, organizationId } = await getSearchContext()
  const pattern = toSearchPattern(query)

  const [
    songTitlesResult,
    songArtistsResult,
    songAlbumsResult,
    setlistNamesResult,
    setlistDescriptionsResult,
  ] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, album, status")
      .eq("organization_id", organizationId)
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(6),
    supabase
      .from("songs")
      .select("id, title, artist, album, status")
      .eq("organization_id", organizationId)
      .ilike("artist", pattern)
      .order("title", { ascending: true })
      .limit(6),
    supabase
      .from("songs")
      .select("id, title, artist, album, status")
      .eq("organization_id", organizationId)
      .ilike("album", pattern)
      .order("title", { ascending: true })
      .limit(6),
    supabase
      .from("setlists")
      .select("id, name, service_date, status, updated_at")
      .eq("organization_id", organizationId)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("setlists")
      .select("id, name, service_date, status, updated_at")
      .eq("organization_id", organizationId)
      .ilike("description", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
  ])

  if (
    songTitlesResult.error ||
    songArtistsResult.error ||
    songAlbumsResult.error ||
    setlistNamesResult.error ||
    setlistDescriptionsResult.error
  ) {
    console.error("search_workspace_live failed:", {
      code:
        songTitlesResult.error?.code ??
        songArtistsResult.error?.code ??
        songAlbumsResult.error?.code ??
        setlistNamesResult.error?.code ??
        setlistDescriptionsResult.error?.code,
    })

    return {
      success: false as const,
      error: "Search is temporarily unavailable. Please try again.",
    }
  }

  const songs = Array.from(
    new Map(
      [
        ...(songTitlesResult.data ?? []),
        ...(songArtistsResult.data ?? []),
        ...(songAlbumsResult.data ?? []),
      ].map((song) => [song.id, song as LiveSearchSong])
    ).values()
  ).slice(0, 6)

  const setlists = Array.from(
    new Map(
      [
        ...(setlistNamesResult.data ?? []),
        ...(setlistDescriptionsResult.data ?? []),
      ].map((setlist) => [setlist.id, setlist as LiveSearchSetlist])
    ).values()
  ).slice(0, 6)

  return {
    success: true as const,
    songs,
    setlists,
  }
}
