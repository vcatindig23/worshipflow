import Link from "next/link"
import {
  Archive,
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  List,
  Music2,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Clock3,
  BarChart3,
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
  open_count: number
}

type SongTagRow = {
  song_id: string
  tag_id: string
}

type Tag = {
  id: string
  name: string
}

type SongSort =
  | "title"
  | "recent"
  | "artist"
  | "album"
  | "newest"
  | "updated"
  | "tempo-asc"
  | "tempo-desc"

type TempoBucket = "all" | "slow" | "moderate" | "upbeat" | "unset"

const tempoBucketLabels: Record<TempoBucket, string> = {
  all: "Any tempo",
  slow: "Slow · up to 80 BPM",
  moderate: "Mid-tempo · 81–119 BPM",
  upbeat: "Upbeat · 120+ BPM",
  unset: "Tempo not set",
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

  if (!Object.prototype.hasOwnProperty.call(updates, "page")) {
    nextParams.delete("page")
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
  const requestedPage = Number.parseInt(getParam(params.page) ?? "1", 10)
  const requestedPageNumber = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
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
  const requestedKey = getParam(params.key)?.trim() ?? ""
  const requestedTempo = getParam(params.tempo) ?? "all"
  const favoriteOnly =
    getParam(params.favorite) === "true"
  const view = getParam(params.view) === "grid" ? "grid" : "list"

  const validSorts: SongSort[] = [
    "title",
    "recent",
    "artist",
    "album",
    "newest",
    "updated",
    "tempo-asc",
    "tempo-desc",
  ]
  const sort: SongSort = validSorts.includes(requestedSort as SongSort)
    ? (requestedSort as SongSort)
    : "title"
  const validTempoBuckets: TempoBucket[] = [
    "all",
    "slow",
    "moderate",
    "upbeat",
    "unset",
  ]
  const tempoBucket: TempoBucket = validTempoBuckets.includes(
    requestedTempo as TempoBucket
  )
    ? (requestedTempo as TempoBucket)
    : "all"

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
  const availableKeys = Array.from(
    new Set(
      songs
        .map((song) => song.current_key?.trim())
        .filter((key): key is string => Boolean(key))
    )
  ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
  const selectedKey = availableKeys.find(
    (key) => key.toLocaleLowerCase("en") === requestedKey.toLocaleLowerCase("en")
  ) ?? ""

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
          "song_id, is_favorite, last_opened_at, open_count"
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

  const recentlyOpened = songs
    .filter((song) => Boolean(preferencesBySong.get(song.id)?.last_opened_at))
    .sort((a, b) =>
      Date.parse(preferencesBySong.get(b.id)?.last_opened_at ?? "") -
      Date.parse(preferencesBySong.get(a.id)?.last_opened_at ?? "")
    )
    .slice(0, 5)

  const frequentlyOpened = songs
    .filter((song) => (preferencesBySong.get(song.id)?.open_count ?? 0) > 0)
    .sort((a, b) =>
      (preferencesBySong.get(b.id)?.open_count ?? 0) - (preferencesBySong.get(a.id)?.open_count ?? 0) ||
      Date.parse(preferencesBySong.get(b.id)?.last_opened_at ?? "") -
      Date.parse(preferencesBySong.get(a.id)?.last_opened_at ?? "")
    )
    .slice(0, 5)

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

    if (
      selectedKey &&
      song.current_key?.trim().toLocaleLowerCase("en") !==
        selectedKey.toLocaleLowerCase("en")
    ) {
      return false
    }

    if (tempoBucket === "unset" && song.tempo !== null) {
      return false
    }
    if (tempoBucket === "slow" && (song.tempo === null || song.tempo > 80)) {
      return false
    }
    if (
      tempoBucket === "moderate" &&
      (song.tempo === null || song.tempo < 81 || song.tempo > 119)
    ) {
      return false
    }
    if (tempoBucket === "upbeat" && (song.tempo === null || song.tempo < 120)) {
      return false
    }

    if (!query) {
      return true
    }

    const searchableText = [
      song.title,
      song.artist,
      song.album,
      song.current_key,
      song.tempo === null ? null : String(song.tempo),
      ...songTags.map((tag) => tag.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return searchableText.includes(
      query.toLowerCase()
    )
  })

  const compareTitles = (a: Song, b: Song) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" })
  const compareNullableText = (a: string | null, b: string | null) =>
    (a?.trim() ?? "").localeCompare(b?.trim() ?? "", "en", {
      sensitivity: "base",
      numeric: true,
    })

  filteredSongs.sort((a, b) => {
    if (sort === "recent") {
      const aOpened = preferencesBySong.get(a.id)?.last_opened_at
      const bOpened = preferencesBySong.get(b.id)?.last_opened_at
      if (!aOpened && !bOpened) return compareTitles(a, b)
      if (!aOpened) return 1
      if (!bOpened) return -1
      return new Date(bOpened).getTime() - new Date(aOpened).getTime() ||
        compareTitles(a, b)
    }

    if (sort === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
        compareTitles(a, b)
    }

    if (sort === "updated") {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() ||
        compareTitles(a, b)
    }

    if (sort === "artist") {
      return compareNullableText(a.artist, b.artist) || compareTitles(a, b)
    }

    if (sort === "album") {
      return compareNullableText(a.album, b.album) || compareTitles(a, b)
    }

    if (sort === "tempo-asc" || sort === "tempo-desc") {
      if (a.tempo === null && b.tempo === null) return compareTitles(a, b)
      if (a.tempo === null) return 1
      if (b.tempo === null) return -1
      const tempoDifference = sort === "tempo-asc"
        ? a.tempo - b.tempo
        : b.tempo - a.tempo
      return tempoDifference || compareTitles(a, b)
    }

    return compareTitles(a, b)
  })

  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize))
  const page = Math.min(requestedPageNumber, totalPages)
  const paginatedSongs = filteredSongs.slice((page - 1) * pageSize, page * pageSize)
  const pageHref = (targetPage: number) => buildHref(params, { page: String(targetPage) })

  const canEdit = editableRoles.includes(
    workspace.role
  )

  const favoriteHref = buildHref(params, {
    favorite: favoriteOnly
      ? undefined
      : "true",
  })
  const hasActiveFilters = Boolean(
    query ||
    favoriteOnly ||
    selectedTag ||
    selectedKey ||
    tempoBucket !== "all" ||
    status !== "active" ||
    sort !== "title"
  )
  const clearFiltersHref = buildHref(params, {
    q: undefined,
    sort: undefined,
    status: undefined,
    favorite: undefined,
    tag: undefined,
    key: undefined,
    tempo: undefined,
    view: view === "grid" ? "grid" : undefined,
  })
  const activeFilterCount = [
    query,
    favoriteOnly ? "favorite" : "",
    selectedTag,
    selectedKey,
    tempoBucket !== "all" ? tempoBucket : "",
    status !== "active" ? status : "",
    sort !== "title" ? sort : "",
  ].filter(Boolean).length
  const filterDescriptions = [
    query ? "Search: " + query : null,
    status === "archived" ? "Archived songs" : status === "all" ? "Active and archived songs" : null,
    favoriteOnly ? "Favorites" : null,
    selectedTag ? "Tag: " + selectedTag : null,
    selectedKey ? "Key: " + selectedKey : null,
    tempoBucket !== "all" ? tempoBucketLabels[tempoBucket] : null,
  ].filter((description): description is string => Boolean(description))

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

      <section aria-label="Song usage analytics" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-[var(--brand)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Frequently used</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Songs you open most often on this account.</p>
          {frequentlyOpened.length ? (
            <ol className="mt-4 space-y-3">
              {frequentlyOpened.map((song, index) => (
                <li key={song.id} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-semibold text-[var(--muted)]" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
                  <Link href={`/songs/${song.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40">
                    {song.title}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">{preferencesBySong.get(song.id)?.open_count ?? 0} opens</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Usage data will appear here as you open charts.</p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-[var(--brand)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Recently opened</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Pick up where you left off.</p>
          {recentlyOpened.length ? (
            <ul className="mt-4 space-y-3">
              {recentlyOpened.map((song) => (
                <li key={song.id} className="flex items-center gap-3">
                  <Music2 className="size-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                  <Link href={`/songs/${song.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/40">
                    {song.title}
                  </Link>
                  <time className="shrink-0 text-xs text-[var(--muted)]" dateTime={preferencesBySong.get(song.id)?.last_opened_at ?? undefined}>{formatDate(preferencesBySong.get(song.id)!.last_opened_at!)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">Your recent songs will appear here after you view a chart.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--border)] bg-white p-3 shadow-sm sm:p-4">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-2 py-2 outline-none transition hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 [&::-webkit-details-marker]:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <SlidersHorizontal className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--foreground)]">Search & filters</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                {hasActiveFilters
                  ? filterDescriptions.length
                    ? filterDescriptions.join(" · ")
                    : "Custom sorting applied"
                  : "Search songs, sort your library, or filter by key, tempo, and tags."}
              </span>
            </span>
            {activeFilterCount > 0 ? (
              <span className="hidden shrink-0 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)] sm:inline-flex">
                {activeFilterCount} active
              </span>
            ) : null}
            <ChevronDown className="size-4 shrink-0 text-[var(--muted)] transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 border-t border-[var(--border)] px-1 pb-1 pt-4">
        <form
          action="/songs"
          method="get"
          className="flex flex-col gap-3 2xl:flex-row"
        >
          <input type="hidden" name="view" value={view} />
          {favoriteOnly ? <input type="hidden" name="favorite" value="true" /> : null}
          {selectedTag ? <input type="hidden" name="tag" value={selectedTag} /> : null}
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
            <option value="title">Title A–Z</option>
            <option value="artist">Artist A–Z</option>
            <option value="album">Album A–Z</option>
            <option value="recent">Recently Used</option>
            <option value="newest">Recently Added</option>
            <option value="updated">Recently Updated</option>
            <option value="tempo-asc">Slowest Tempo</option>
            <option value="tempo-desc">Fastest Tempo</option>
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

          <select
            name="key"
            defaultValue={selectedKey}
            aria-label="Filter by musical key"
            className="h-11 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="">All keys</option>
            {availableKeys.map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>

          <select
            name="tempo"
            defaultValue={tempoBucket}
            aria-label="Filter by tempo"
            className="h-11 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            {Object.entries(tempoBucketLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
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
          </div>
        </details>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {filteredSongs.length}{" "}
              {filteredSongs.length === 1
                ? "song"
                : "songs"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {filterDescriptions.length
                ? filterDescriptions.join(" · ")
                : "Your church song catalog"}
            </p>
            {sort !== "title" ? (
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Sorted by {sort === "recent"
                  ? "recently used"
                  : sort === "newest"
                    ? "recently added"
                    : sort === "updated"
                      ? "recently updated"
                      : sort === "artist"
                        ? "artist"
                        : sort === "album"
                          ? "album"
                          : sort === "tempo-asc"
                            ? "slowest tempo"
                            : "fastest tempo"}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            {hasActiveFilters ? (
              <Link
                href={clearFiltersHref}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <SlidersHorizontal className="size-3.5" />
                Clear filters
              </Link>
            ) : null}
            <div role="group" aria-label="Song layout" className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white p-1 shadow-sm">
              <Link
                href={buildHref(params, { view: undefined })}
                aria-label="List view"
                aria-current={view === "list" ? "page" : undefined}
                title="List view"
                className={`flex size-8 items-center justify-center rounded-lg transition ${
                  view === "list" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                <List className="size-4" />
              </Link>
              <Link
                href={buildHref(params, { view: "grid" })}
                aria-label="Grid view"
                aria-current={view === "grid" ? "page" : undefined}
                title="Grid view"
                className={`flex size-8 items-center justify-center rounded-lg transition ${
                  view === "grid" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--muted)] hover:bg-[var(--surface)]"
                }`}
              >
                <Grid2X2 className="size-4" />
              </Link>
            </div>
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
          <div className={view === "grid" ? "grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
            {paginatedSongs.map((song) => {
              const preference =
                preferencesBySong.get(song.id)

              const songTags =
                tagsBySong.get(song.id) ?? []

              return (
                <div
                  key={song.id}
                  className={`group rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)]/25 hover:shadow-md focus-within:border-[var(--brand)]/25 ${
                    view === "grid" ? "flex h-full flex-col p-5" : ""
                  }`}
                >
                  <div className={`flex flex-col gap-4 ${
                    view === "grid" ? "flex-1" : "sm:flex-row sm:items-center sm:justify-between"
                  }`}>
                    <Link
                      href={`/songs/${song.id}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          {song.status === "archived" ? (
                            <Archive className="size-4" />
                          ) : (
                            <Music2 className="size-4" strokeWidth={1.9} />
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
                            {song.artist || "Unknown artist"}
                          </p>
                          {song.album ? (
                            <p className="mt-1 truncate text-xs text-[var(--muted)]">
                              {song.album}
                            </p>
                          ) : null}

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

                    <div className={`flex shrink-0 items-center gap-2 ${
                      view === "grid" ? "mt-4 border-t border-[var(--border)] pt-3" : ""
                    }`}>
                      {song.current_key ? (
                        <span className={`rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] ${
                          view === "grid" ? "inline-flex" : "hidden md:inline-flex"
                        }`}>
                          {song.current_key}
                        </span>
                      ) : null}

                      {song.tempo ? (
                        <span className={`rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] ${
                          view === "grid" ? "inline-flex" : "hidden lg:inline-flex"
                        }`}>
                          {song.tempo} BPM
                        </span>
                      ) : null}

                      <form action={toggleFavorite}>
                        <input
                          type="hidden"
                          name="songId"
                          value={song.id}
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={buildHref(params, {})}
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
        {totalPages > 1 ? (
          <nav aria-label="Song pages" className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3">
            <p className="text-sm text-[var(--muted)]">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSongs.length)} of {filteredSongs.length} songs</p>
            <div className="flex items-center gap-2">
              {page > 1 ? <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]">Previous</Link> : null}
              {page < totalPages ? <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]">Next</Link> : null}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  )
}
