import Link from "next/link"
import {
  ArrowLeft,
  Edit3,
  Guitar,
  Music2,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SongViewer from "@/components/songs/song-viewer"

type SongPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function SongPage({
  params,
}: SongPageProps) {
  const { id } = await params
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
    throw new Error("Unable to determine church membership.")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select(
      "id, title, artist, current_key, original_key, tempo, time_signature, capo, chordpro_source, notes, updated_at"
    )
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .eq("status", "active")
    .maybeSingle()

  if (songError) {
    throw new Error(`Unable to load song: ${songError.message}`)
  }

  if (!song) {
    notFound()
  }

  const canEdit = new Set([
    "admin",
    "worship_leader",
    "song_editor",
  ]).has(membership.role)

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/songs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Songs
          </Link>

          {canEdit ? (
            <Link
              href={`/songs/${song.id}/edit`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
            >
              <Edit3 className="size-4" />
              Edit song
            </Link>
          ) : null}
        </div>

        <header className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] sm:flex">
                <Guitar className="size-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--brand)]">
                  <Music2 className="size-3.5" />
                  Song chart
                </div>

                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  {song.title}
                </h1>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  {song.artist || "Unknown artist"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Key
                </div>

                <div className="mt-0.5 text-sm font-semibold">
                  {song.current_key ||
                    song.original_key ||
                    "—"}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  BPM
                </div>

                <div className="mt-0.5 text-sm font-semibold">
                  {song.tempo ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Time
                </div>

                <div className="mt-0.5 text-sm font-semibold">
                  {song.time_signature}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  Capo
                </div>

                <div className="mt-0.5 text-sm font-semibold">
                  {song.capo}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6">
          <SongViewer source={song.chordpro_source} />
        </div>

        {song.notes ? (
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold">
              Arrangement notes
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {song.notes}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  )
}