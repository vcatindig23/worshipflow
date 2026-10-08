import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import ChordProImportEditor from "@/components/songs/chordpro-import-editor"
import { createClient } from "@/lib/supabase/server"
import { updateSong } from "./actions"

type EditSongPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    error?: string
  }>
}

const errors: Record<string, string> = {
  invalid_details:
    "Please check the song information and try again.",
  invalid_chordpro:
    "The ChordPro content contains invalid formatting.",
  membership_failed:
    "We could not determine your church workspace.",
  not_authorized:
    "You do not have permission to edit this song.",
  update_failed:
    "The song could not be updated. Please try again.",
}

export default async function EditSongPage({
  params,
  searchParams,
}: EditSongPageProps) {
  const { id } = await params
  const query = await searchParams

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

  const allowedRoles = new Set([
    "admin",
    "worship_leader",
    "song_editor",
  ])

  if (!allowedRoles.has(membership.role)) {
    redirect(`/songs/${id}?error=not_authorized`)
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select(
      "id, title, artist, current_key, original_key, tempo, time_signature, capo, chordpro_source, notes"
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

  const errorMessage = query.error
    ? errors[query.error] ?? "Something went wrong."
    : null

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/songs/${song.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Song
          </Link>

          <span className="text-sm font-semibold">
            Edit song
          </span>
        </div>

        <header className="mt-8">
          <p className="text-sm font-medium text-[var(--brand)]">
            Song library
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
            Edit {song.title}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Saving this song creates a new version while preserving its
            previous chart in version history.
          </p>
        </header>

        {errorMessage ? (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}

        <form action={updateSong} className="mt-6 space-y-6">
          <input
            type="hidden"
            name="id"
            value={song.id}
          />

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">
              Song information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Song title
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  defaultValue={song.title}
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="artist"
                  className="mb-2 block text-sm font-medium"
                >
                  Artist / writer
                </label>

                <input
                  id="artist"
                  name="artist"
                  type="text"
                  maxLength={200}
                  defaultValue={song.artist ?? ""}
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="tempo"
                    className="mb-2 block text-sm font-medium"
                  >
                    BPM
                  </label>

                  <input
                    id="tempo"
                    name="tempo"
                    type="number"
                    min={20}
                    max={300}
                    defaultValue={song.tempo ?? ""}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="timeSignature"
                    className="mb-2 block text-sm font-medium"
                  >
                    Time
                  </label>

                  <input
                    id="timeSignature"
                    name="timeSignature"
                    type="text"
                    required
                    defaultValue={song.time_signature}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="capo"
                    className="mb-2 block text-sm font-medium"
                  >
                    Capo
                  </label>

                  <input
                    id="capo"
                    name="capo"
                    type="number"
                    min={0}
                    max={12}
                    defaultValue={song.capo}
                    className="h-11 w-full rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold">
              Chords and lyrics
            </h2>

            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Use ChordPro notation with chords inside square brackets.
            </p>

            <ChordProImportEditor
              source={song.chordpro_source}
              className="mt-5 min-h-[430px] w-full rounded-2xl border border-[var(--border)] bg-[#151d18] px-4 py-4 font-mono text-sm leading-7 text-white outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
            />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium"
            >
              Arrangement notes
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={5}
              maxLength={10000}
              defaultValue={song.notes ?? ""}
              placeholder="Transitions, arrangement reminders, or team notes..."
              className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
            />
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/songs/${song.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold transition hover:bg-[var(--surface)]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <Save className="size-4" />
              Save new version
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}