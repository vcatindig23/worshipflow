import Link from "next/link"
import {
  FileMusic,
  Music2,
  Plus,
  Search,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type SongsPageProps = {
  searchParams: Promise<{
    q?: string
  }>
}

export default async function SongsPage({
  searchParams,
}: SongsPageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

  if (membershipError) {
    throw new Error("Unable to determine church membership.")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const { data: songs, error: songsError } = await supabase
    .from("songs")
    .select(
      "id, title, artist, current_key, original_key, tempo, time_signature, capo, updated_at"
    )
    .eq("organization_id", membership.organization_id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })

  if (songsError) {
    throw new Error(`Unable to load songs: ${songsError.message}`)
  }

  const filteredSongs = query
    ? songs.filter((song) => {
        const value = query.toLowerCase()

        return (
          song.title.toLowerCase().includes(value) ||
          (song.artist ?? "").toLowerCase().includes(value)
        )
      })
    : songs

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
              Songs
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Manage your church&apos;s songs, chords, lyrics, keys, tempos, and
              arrangements.
            </p>
          </div>

          <Link
            href="/songs/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
          >
            <Plus className="size-4" />
            New song
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white">
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <form
              action="/songs"
              method="get"
              className="relative max-w-xl"
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search songs or artists..."
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:bg-white focus:ring-4 focus:ring-[var(--brand-soft)]"
              />
            </form>
          </div>

          {filteredSongs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <FileMusic className="size-6" />
              </div>

              <h2 className="mt-5 text-lg font-semibold">
                {query ? "No songs found" : "Your song library is empty"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                {query
                  ? "Try another song title or artist."
                  : "Create your first song chart to start building your worship library."}
              </p>

              {!query ? (
                <Link
                  href="/songs/new"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
                >
                  <Plus className="size-4" />
                  Create first song
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    <th className="px-5 py-3 sm:px-6">Song</th>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">BPM</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Capo</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>

                <tbody>
                  {filteredSongs.map((song) => (
                    <tr
                      key={song.id}
                      className="border-b border-[var(--border)] last:border-b-0"
                    >
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--brand)]">
                            <Music2 className="size-[18px]" />
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {song.title}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                              {song.artist || "Unknown artist"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                          {song.current_key ||
                            song.original_key ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-[var(--muted)]">
                        {song.tempo ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-sm text-[var(--muted)]">
                        {song.time_signature}
                      </td>

                      <td className="px-4 py-4 text-sm text-[var(--muted)]">
                        {song.capo}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/songs/${song.id}`}
                          className="text-xs font-semibold text-[var(--brand)] hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}