import Link from "next/link"
import {
  CalendarDays,
  ListMusic,
  Music2,
  Search,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  normalizeGlobalSearchQuery,
  toSearchPattern,
} from "@/lib/global-search"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type SearchPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type SearchSong = {
  id: string
  title: string
  artist: string | null
  album: string | null
  status: "active" | "archived"
}

type SearchSetlist = {
  id: string
  name: string
  service_date: string | null
  status: "draft" | "published" | "archived"
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date not set"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function statusLabel(status: SearchSetlist["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const [params, workspace] = await Promise.all([
    searchParams,
    getWorkspace(),
  ])
  const query = normalizeGlobalSearchQuery(getParam(params.q))
  let songs: SearchSong[] = []
  let setlists: SearchSetlist[] = []

  if (query) {
    const supabase = await createClient()
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
        .limit(8),
      supabase
        .from("songs")
        .select("id, title, artist, album, status")
        .eq("organization_id", workspace.organizationId)
        .ilike("artist", pattern)
        .order("title", { ascending: true })
        .limit(8),
      supabase
        .from("setlists")
        .select("id, name, service_date, status, updated_at")
        .eq("organization_id", workspace.organizationId)
        .ilike("name", pattern)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("setlists")
        .select("id, name, service_date, status, updated_at")
        .eq("organization_id", workspace.organizationId)
        .ilike("description", pattern)
        .order("updated_at", { ascending: false })
        .limit(8),
    ])

    if (
      songTitlesResult.error ||
      songArtistsResult.error ||
      setlistNamesResult.error ||
      setlistDescriptionsResult.error
    ) {
      redirect("/error?code=global_search_failed")
    }

    songs = Array.from(
      new Map(
        [
          ...(songTitlesResult.data ?? []),
          ...(songArtistsResult.data ?? []),
        ].map((song) => [song.id, song as SearchSong])
      ).values()
    ).slice(0, 8)
    setlists = Array.from(
      new Map(
        [
          ...(setlistNamesResult.data ?? []),
          ...(setlistDescriptionsResult.data ?? []),
        ].map((setlist) => [setlist.id, setlist as SearchSetlist])
      ).values()
    ).slice(0, 8)
  }

  const hasResults = songs.length > 0 || setlists.length > 0

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-6 py-8">
      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <Search className="size-3.5" />
          Workspace search
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
          Search songs and setlists
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Search your {workspace.organizationName} workspace.
        </p>
      </section>

      <form
        action="/search"
        role="search"
        className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm sm:flex-row"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search songs and setlists</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            autoComplete="off"
            placeholder="Song title, artist, setlist, or service..."
            className="h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
        >
          <Search className="size-4" />
          Search
        </button>
      </form>

      {!query ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
          <Search className="mx-auto size-8 text-[var(--muted)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">
            Enter a song title, artist, setlist, or service name to search.
          </p>
        </div>
      ) : !hasResults ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
          <Search className="mx-auto size-8 text-[var(--muted)]" />
          <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            No matches found
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Try a different title, artist, or service name.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {songs.length > 0 ? (
            <section aria-labelledby="song-results-title">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  id="song-results-title"
                  className="text-lg font-semibold text-[var(--foreground)]"
                >
                  Songs
                </h2>
                <span className="text-xs text-[var(--muted)]">
                  Up to 8 matches
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {songs.map((song) => (
                  <li key={song.id}>
                    <Link
                      href={`/songs/${song.id}`}
                      className="flex h-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--brand)] hover:shadow-sm"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Music2 className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                          {song.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                          {song.artist || song.album || "Artist not set"}
                        </span>
                        {song.status === "archived" ? (
                          <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            Archived
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {setlists.length > 0 ? (
            <section aria-labelledby="setlist-results-title">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  id="setlist-results-title"
                  className="text-lg font-semibold text-[var(--foreground)]"
                >
                  Setlists and services
                </h2>
                <span className="text-xs text-[var(--muted)]">
                  Up to 8 matches
                </span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {setlists.map((setlist) => (
                  <li key={setlist.id}>
                    <Link
                      href={`/setlists/${setlist.id}`}
                      className="flex h-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--brand)] hover:shadow-sm"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                        {setlist.service_date ? (
                          <CalendarDays className="size-5" />
                        ) : (
                          <ListMusic className="size-5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                          {setlist.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {formatDate(setlist.service_date)}
                        </span>
                        <span className="mt-2 inline-flex rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                          {statusLabel(setlist.status)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </main>
  )
}
