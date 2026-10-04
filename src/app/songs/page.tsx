import Link from "next/link"
import {
  Archive,
  ArrowDownUp,
  ChevronRight,
  Plus,
  Search,
  Star,
} from "lucide-react"
import { redirect } from "next/navigation"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createClient } from "@/lib/supabase/server"
import {
  setSongStatus,
  toggleFavorite,
} from "./actions"

type SongsPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Song = {
  id: string
  title: string
  artist: string | null
  album: string | null
  current_key: string | null
  tempo: number | null
  time_signature: string | null
  capo: number | null
  status: "active" | "archived"
  created_at: string
  updated_at: string
}

type Preference = {
  song_id: string
  is_favorite: boolean
  last_opened_at: string | null
}

type SongTagRow = {
  song_id: string
  tag_id: string
}

type Tag = {
  id: string
  name: string
}

const editableRoles = [
  "admin",
  "worship_leader",
  "song_editor",
]

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function buildHref(
  currentParams: Record<
    string,
    string | string[] | undefined
  >,
  updates: Record<string, string | undefined>
) {
  const nextParams = new URLSearchParams()

  for (const [key, value] of Object.entries(
    currentParams
  )) {
    const normalized = getParam(value)

    if (normalized) {
      nextParams.set(key, normalized)
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
  }

  const query = nextParams.toString()

  return query ? `/songs?${query}` : "/songs"
}

export default async function SongsPage({
  searchParams,
}: SongsPageProps) {
  const params = await searchParams
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const query = getParam(params.q)?.trim() ?? ""
  const requestedSort = getParam(params.sort) ?? "title"
  const requestedStatus =
    getParam(params.status) ?? "active"
  const selectedTag =
    getParam(params.tag)?.trim() ?? ""
  const favoriteOnly =
    getParam(params.favorite) === "true"

  const sort =
    requestedSort === "recent" ? "recent" : "title"

  const status =
    requestedStatus === "archived"
      ? "archived"
      : requestedStatus === "all"
        ? "all"
        : "active"

  const songQuery = supabase
    .from("songs")
    .select(
      "id, title, artist, album, current_key, tempo, time_signature, capo, status, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(500)

  if (status !== "all") {
    songQuery.eq("status", status)
  }

  const {
    data: songRows,
    error: songsError,
  } = await songQuery

  if (songsError) {
    redirect("/error?code=songs_load_failed")
  }

  const songs = (songRows ?? []) as Song[]
  const songIds = songs.map((song) => song.id)

  let preferences: Preference[] = []
  let songTagRows: SongTagRow[] = []
  let tags: Tag[] = []

  if (songIds.length > 0) {
    const [
      preferencesResult,
      songTagsResult,
      tagsResult,
    ] = await Promise.all([
      supabase
        .from("song_user_preferences")
        .select(
          "song_id, is_favorite, last_opened_at"
        )
        .eq("user_id", userId)
        .in("song_id", songIds),

      supabase
        .from("song_tags")
        .select("song_id, tag_id")
        .in("song_id", songIds),

      supabase
        .from("tags")
        .select("id, name")
        .eq(
          "organization_id",
          workspace.organizationId
        )
        .order("name", { ascending: true }),
    ])

    preferences =
      (preferencesResult.data ?? []) as Preference[]

    songTagRows =
      (songTagsResult.data ?? []) as SongTagRow[]

    tags = (tagsResult.data ?? []) as Tag[]
  }

  const preferencesBySong = new Map(
    preferences.map((preference) => [
      preference.song_id,
      preference,
    ])
  )

  const tagsById = new Map(
    tags.map((tag) => [tag.id, tag])
  )

  const tagsBySong = new Map<string, Tag[]>()

  for (const row of songTagRows) {
    const tag = tagsById.get(row.tag_id)

    if (!tag) {
      continue
    }

    const existing =
      tagsBySong.get(row.song_id) ?? []

    existing.push(tag)
    tagsBySong.set(row.song_id, existing)
  }

  const filteredSongs = songs.filter((song) => {
    const preference =
      preferencesBySong.get(song.id)

    const songTags =
      tagsBySong.get(song.id) ?? []

    if (favoriteOnly && !preference?.is_favorite) {
      return false
    }

    if (
      selectedTag &&
      !songTags.some(
        (tag) =>
          tag.name.toLowerCase() ===
          selectedTag.toLowerCase()
      )
    ) {
      return false
    }

    if (!query) {
      return true
    }

    const searchableText = [
      song.title,
      song.artist,
      song.album,
      ...songTags.map((tag) => tag.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchableText.includes(
      query.toLowerCase()
    )
  })

  if (sort === "recent") {
    filteredSongs.sort((a, b) => {
      const aOpened =
        preferencesBySong.get(
          a.id
        )?.last_opened_at

      const bOpened =
        preferencesBySong.get(
          b.id
        )?.last_opened_at

      if (!aOpened && !bOpened) {
        return a.title.localeCompare(b.title)
      }

      if (!aOpened) {
        return 1
      }

      if (!bOpened) {
        return -1
      }

      return (
        new Date(bOpened).getTime() -
        new Date(aOpened).getTime()
      )
    })
  } else {
    filteredSongs.sort((a, b) =>
      a.title.localeCompare(b.title)
    )
  }

  const canEdit = editableRoles.includes(
    workspace.role
  )

  const favoriteHref = buildHref(params, {
    favorite: favoriteOnly
      ? undefined
      : "true",
  })

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            Song Library
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
            Songs
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Keep your church&apos;s worship catalog organized,
            searchable, and ready for every service.
          </p>
        </div>

        <Link
          href="/songs/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
        >
          <Plus className="size-4" />
          Add Song
        </Link>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <form
          action="/songs"
          method="get"
          className="flex flex-col gap-3 lg:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

            <input
              name="q"
              defaultValue={query}
              placeholder="Search songs, artists, albums, or tags..."
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </div>

          <select
            name="sort"
            defaultValue={sort}
            className="h-11 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="title">
              Title A–Z
            </option>
            <option value="recent">
              Recently Used
            </option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="active">
              Active
            </option>
            <option value="archived">
              Archived
            </option>
            <option value="all">
              All Songs
            </option>
          </select>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]"
          >
            <ArrowDownUp className="size-4" />
            Apply
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={buildHref(params, {
              favorite: undefined,
              tag: undefined,
            })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              !favoriteOnly && !selectedTag
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            }`}
          >
            All
          </Link>

          <Link
            href={favoriteHref}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              favoriteOnly
                ? "bg-[var(--brand)] text-white"
                : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
            }`}
          >
            <Star className="size-3.5" />
            Favorites
          </Link>

          {tags.slice(0, 12).map((tag) => (
            <Link
              key={tag.id}
              href={buildHref(params, {
                tag:
                  selectedTag.toLowerCase() ===
                  tag.name.toLowerCase()
                    ? undefined
                    : tag.name,
              })}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedTag.toLowerCase() ===
                tag.name.toLowerCase()
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              }`}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {filteredSongs.length}{" "}
              {filteredSongs.length === 1
                ? "song"
                : "songs"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {status === "archived"
                ? "Showing archived songs"
                : favoriteOnly
                  ? "Showing your favorites"
                  : selectedTag
                    ? `Filtered by ${selectedTag}`
                    : "Your church song catalog"}
            </p>
          </div>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Search className="size-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
              No songs found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Try changing your search or filters, or add
              your first song to the library.
            </p>

            <Link
              href="/songs/new"
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <Plus className="size-4" />
              Add Song
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSongs.map((song) => {
              const preference =
                preferencesBySong.get(song.id)

              const songTags =
                tagsBySong.get(song.id) ?? []

              return (
                <div
                  key={song.id}
                  className="group rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/songs/${song.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          {song.status === "archived" ? (
                            <Archive className="size-4" />
                          ) : (
                            <span className="text-sm font-bold">
                              ♪
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                              {song.title}
                            </h2>

                            {song.status === "archived" ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                Archived
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-1 truncate text-sm text-[var(--muted)]">
                            {song.artist ||
                              "Unknown artist"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {songTags
                              .slice(0, 4)
                              .map((tag) => (
                                <span
                                  key={tag.id}
                                  className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]"
                                >
                                  {tag.name}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2">
                      {song.current_key ? (
                        <span className="hidden rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] md:inline-flex">
                          {song.current_key}
                        </span>
                      ) : null}

                      {song.tempo ? (
                        <span className="hidden rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] lg:inline-flex">
                          {song.tempo} BPM
                        </span>
                      ) : null}

                      <form action={toggleFavorite}>
                        <input
                          type="hidden"
                          name="songId"
                          value={song.id}
                        />

                        <button
                          type="submit"
                          aria-label={
                            preference?.is_favorite
                              ? `Remove ${song.title} from favorites`
                              : `Add ${song.title} to favorites`
                          }
                          className={`flex size-9 items-center justify-center rounded-xl border transition ${
                            preference?.is_favorite
                              ? "border-amber-200 bg-amber-50 text-amber-600"
                              : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                          }`}
                        >
                          <Star
                            className="size-4"
                            fill={
                              preference?.is_favorite
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </form>

                      {canEdit ? (
                        <form action={setSongStatus}>
                          <input
                            type="hidden"
                            name="songId"
                            value={song.id}
                          />

                          <input
                            type="hidden"
                            name="status"
                            value={
                              song.status === "active"
                                ? "archived"
                                : "active"
                            }
                          />

                          <button
                            type="submit"
                            aria-label={
                              song.status === "active"
                                ? `Archive ${song.title}`
                                : `Restore ${song.title}`
                            }
                            className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                          >
                            {song.status ===
                            "active" ? (
                              <Archive className="size-4" />
                            ) : (
                              <span className="text-xs font-bold">
                                ↺
                              </span>
                            )}
                          </button>
                        </form>
                      ) : null}

                      <Link
                        href={`/songs/${song.id}`}
                        aria-label={`Open ${song.title}`}
                        className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
                    <span>
                      Updated {formatDate(song.updated_at)}
                    </span>

                    {preference?.last_opened_at ? (
                      <span>
                        Recently opened
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}