"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  normalizeGlobalSearchQuery,
  toSearchPattern,
} from "@/lib/global-search"
import { getWorkspace } from "@/lib/workspace/get-workspace"

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

  const [workspace, supabase] = await Promise.all([
    getWorkspace(),
    createClient(),
  ])
  const pattern = toSearchPattern(query)

  const [
    songTitlesResult,
    songArtistsResult,
    setlistNamesResult,
    setlistDescriptionsResult,
  ] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, album, status")
      .eq("organization_id", workspace.organizationId)
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(6),
    supabase
      .from("songs")
      .select("id, title, artist, album, status")
      .eq("organization_id", workspace.organizationId)
      .ilike("artist", pattern)
      .order("title", { ascending: true })
      .limit(6),
    supabase
      .from("setlists")
      .select("id, name, service_date, status, updated_at")
      .eq("organization_id", workspace.organizationId)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("setlists")
      .select("id, name, service_date, status, updated_at")
      .eq("organization_id", workspace.organizationId)
      .ilike("description", pattern)
      .order("updated_at", { ascending: false })
      .limit(6),
  ])

  if (
    songTitlesResult.error ||
    songArtistsResult.error ||
    setlistNamesResult.error ||
    setlistDescriptionsResult.error
  ) {
    console.error("search_workspace_live failed:", {
      code:
        songTitlesResult.error?.code ??
        songArtistsResult.error?.code ??
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
