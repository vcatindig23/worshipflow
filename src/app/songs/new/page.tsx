import Link from "next/link"
import { ArrowLeft, Music2 } from "lucide-react"
import { createSong } from "./actions"
import ChordProImportEditor from "@/components/songs/chordpro-import-editor"

type NewSongPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

const errors: Record<string, string> = {
  invalid_details:
    "Please check the song information and try again.",
  invalid_chordpro:
    "The ChordPro content contains invalid chord or directive formatting.",
  membership_failed:
    "We could not determine your church workspace.",
  not_authorized:
    "You do not have permission to create songs.",
  create_failed:
    "The song could not be saved. Please try again.",
}

const starterSong = `{title: Amazing Grace}
{artist: John Newton}
{key: G}

{start_of_verse}
[G]Amazing grace how [C]sweet the [G]sound
That [G]saved a [D]wretch like [G]me
{end_of_verse}`

export default async function NewSongPage({
  searchParams,
}: NewSongPageProps) {
  const params = await searchParams
  const errorMessage = params.error
    ? errors[params.error] ?? "Something went wrong."
    : null

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/songs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Songs
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
              <Music2 className="size-4" />
            </div>
            WorshipFlow
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-[var(--brand)]">
            Song library
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
            Create a song
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Add the song details and its ChordPro chart. This same source will
            power the song viewer and transposition tools.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          {errorMessage ? (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}

          <form action={createSong} className="space-y-7">
            <section>
              <div className="mb-4">
                <h2 className="text-base font-semibold">
                  Song information
                </h2>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  Basic information for your worship team&apos;s song library.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
                    placeholder="Amazing Grace"
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
                    placeholder="John Newton"
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
                      placeholder="72"
                      className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
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
                      defaultValue="4/4"
                      required
                      className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
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
                      defaultValue={0}
                      required
                      className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="text-base font-semibold">
                  Chords and lyrics
                </h2>

                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Place each chord in square brackets immediately before the
                  lyric it belongs to.
                </p>
              </div>

              <ChordProImportEditor
                source={starterSong}
                className="min-h-[380px] w-full rounded-2xl border border-[var(--border)] bg-[#151d18] px-4 py-4 font-mono text-sm leading-7 text-white outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
              />
            </section>

            <section>
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium"
              >
                Arrangement notes
              </label>

              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={10000}
                placeholder="Transitions, arrangement reminders, or worship-team notes..."
                className="w-full rounded-xl border border-[var(--border)] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
              />
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/songs"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold transition hover:bg-[var(--surface)]"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
              >
                Save song
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}