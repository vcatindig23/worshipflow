import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Archive,
  ArrowLeft,
  Music2,
  Edit,
  History,
  RotateCcw,
  Star,
  Tag,
  Printer,
} from "lucide-react"
import RecordSongOpen from "@/components/songs/record-song-open"
import SongViewer from "@/components/songs/song-viewer"
import SongVersionComparison from "@/components/songs/song-version-comparison"
import SongReviewPanel, { type SongReviewComment } from "@/components/songs/song-review-panel"
import DownloadChordProButton from "@/components/songs/download-chordpro-button"
import { setSongStatus, setSongTags, toggleFavorite } from "@/app/songs/actions"
import { createClient } from "@/lib/supabase/server"

type SongPageProps = {
  params: Promise<{
    id: string
  }>
}

type Song = {
  id: string
  organization_id: string
  title: string
  artist: string | null
  album: string | null
  original_key: string | null
  current_key: string | null
  tempo: number | null
  time_signature: string | null
  capo: number | null
  chordpro_source: string
  reference_audio_path: string | null
  notes: string | null
  status: "active" | "archived"
  created_at: string
  updated_at: string
}

type Version = {
  id: string
  version_number: number
  title: string
  artist: string | null
  current_key: string | null
  tempo: number | null
  created_at: string
  chordpro_source: string
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
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

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle()

  if (!membership) {
    redirect("/onboarding")
  }

  const { data: song, error: songError } = await supabase
    .from("songs")
    .select(
      `
        id,
        organization_id,
        title,
        artist,
        album,
        original_key,
        current_key,
        tempo,
        time_signature,
        capo,
        chordpro_source,
        reference_audio_path,
        notes,
        status,
        created_at,
        updated_at
      `
    )
    .eq("id", id)
    .maybeSingle()

  if (songError) {
    redirect("/error?code=song_load_failed")
  }

  if (!song) {
    notFound()
  }

  const typedSong = song as Song

  if (typedSong.organization_id !== membership.organization_id) {
    notFound()
  }

  let referenceAudioUrl: string | null = null
  const referenceAudioPath = typedSong.reference_audio_path
  const expectedAudioPrefix = membership.organization_id + "/"
  if (
    referenceAudioPath &&
    referenceAudioPath.startsWith(expectedAudioPrefix) &&
    referenceAudioPath.split("/").length === 2
  ) {
    const { data: audioData, error: audioError } = await supabase.storage
      .from("workspace-files")
      .createSignedUrl(referenceAudioPath, 3600)

    if (!audioError && audioData?.signedUrl) {
      referenceAudioUrl = audioData.signedUrl
    }
  }

  const referenceAudioName = referenceAudioPath
    ?.split("/")
    .pop()
    ?.replace(/^[0-9a-f-]{36}-/i, "")
    .trim() || null

  const [{ data: songTagRows }, { data: versions }] =
    await Promise.all([
      supabase
        .from("song_tags")
        .select("tag_id")
        .eq("song_id", typedSong.id),
      supabase
        .from("song_versions")
        .select(
          "id, version_number, title, artist, current_key, tempo, created_at, chordpro_source"
        )
        .eq("song_id", typedSong.id)
        .order("version_number", { ascending: false })
        .limit(10),
    ])

  const { data: reviewThread, error: reviewThreadError } = await supabase
    .from("song_review_threads")
    .select("id, status")
    .eq("song_id", typedSong.id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle()

  if (reviewThreadError) {
    console.error("load_song_review_thread failed:", { code: reviewThreadError.code })
  }

  let reviewComments: SongReviewComment[] = []
  if (reviewThread?.id) {
    const { data: commentRows, error: commentsError } = await supabase
      .from("song_review_comments")
      .select("id, user_id, body, created_at")
      .eq("thread_id", reviewThread.id)
      .order("created_at", { ascending: true })
      .limit(100)

    if (commentsError) {
      console.error("load_song_review_comments failed:", { code: commentsError.code })
    } else if (commentRows?.length) {
      const reviewerIds = Array.from(new Set(commentRows.map((comment) => comment.user_id)))
      const { data: reviewerProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", reviewerIds)
      const names = new Map((reviewerProfiles ?? []).map((profile) => [profile.id, profile.display_name]))
      reviewComments = commentRows.map((comment) => ({
        ...comment,
        author_name: names.get(comment.user_id) || "Team member",
      })) as SongReviewComment[]
    }
  }

  const tagIds = (songTagRows ?? []).map(
    (row) => row.tag_id as string
  )

  let tags: Tag[] = []

  if (tagIds.length > 0) {
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, name")
      .in("id", tagIds)
      .order("name", { ascending: true })

    tags = (tagRows ?? []) as Tag[]
  }

  const { data: favoritePreference } = await supabase
    .from("song_user_preferences")
    .select("is_favorite")
    .eq("song_id", typedSong.id)
    .eq("user_id", userId)
    .maybeSingle()

  const isFavorite = Boolean(favoritePreference?.is_favorite)
  const canEdit = editableRoles.includes(membership.role)

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8">
      <RecordSongOpen songId={typedSong.id} />

      <div className="flex flex-col gap-4">
        <Link
          href="/songs"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          Songs
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
                <Music2 className="size-3.5" />
                Song chart
              </span>

              {typedSong.status === "archived" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  <Archive className="size-3.5" />
                  Archived
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 break-words text-3xl font-bold tracking-[-0.035em] text-[var(--foreground)] md:text-4xl">
              {typedSong.title}
            </h1>

            {typedSong.artist ? (
              <p className="mt-2 text-base text-[var(--muted)]">
                {typedSong.artist}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {typedSong.current_key ? (
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--foreground)]">
                  Key {typedSong.current_key}
                </span>
              ) : null}

              {typedSong.tempo ? (
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--foreground)]">
                  {typedSong.tempo} BPM
                </span>
              ) : null}

              {typedSong.time_signature ? (
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--foreground)]">
                  {typedSong.time_signature}
                </span>
              ) : null}

              {typedSong.capo !== null ? (
                <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 font-medium text-[var(--foreground)]">
                  Capo {typedSong.capo}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={toggleFavorite}>
              <input type="hidden" name="songId" value={typedSong.id} />
              <input type="hidden" name="redirectTo" value={`/songs/${typedSong.id}`} />
              <button
                type="submit"
                aria-label={isFavorite ? "Remove song from favorites" : "Add song to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 ${
                  isFavorite
                    ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface)]"
                }`}
              >
                <Star className="size-4" fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? "Favorited" : "Favorite"}
              </button>
            </form>
            <DownloadChordProButton
              source={typedSong.chordpro_source}
              title={typedSong.title}
              artist={typedSong.artist}
            />
            <Link
              href={`/songs/${typedSong.id}/print`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <Printer className="size-4" />
              Print / PDF
            </Link>

            {canEdit ? (
              <Link
                href={`/songs/${typedSong.id}/edit`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                <Edit className="size-4" />
                Edit Song
              </Link>
            ) : null}

            {canEdit ? (
              <form action={setSongStatus}>
                <input
                  type="hidden"
                  name="songId"
                  value={typedSong.id}
                />
                <input
                  type="hidden"
                  name="status"
                  value={
                    typedSong.status === "active"
                      ? "archived"
                      : "active"
                  }
                />

                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  {typedSong.status === "active" ? (
                    <>
                      <Archive className="size-4" />
                      Archive
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Restore
                    </>
                  )}
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4 overflow-hidden rounded-3xl">
          <div className="rounded-3xl border border-[var(--border)] bg-white px-5 py-5 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                  ChordPro
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Song arrangement and chord notation.
                </p>
              </div>

              {typedSong.original_key &&
              typedSong.current_key &&
              typedSong.original_key !== typedSong.current_key ? (
                <span className="hidden rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] sm:inline-flex">
                  Original key {typedSong.original_key}
                </span>
              ) : null}
            </div>
          </div>

          <SongViewer
            source={typedSong.chordpro_source}
            title={typedSong.title}
            tempo={typedSong.tempo}
            songId={typedSong.id}
            organizationId={membership.organization_id}
            userId={userId}
            canEdit={canEdit}
            referenceAudioPath={referenceAudioPath}
            referenceAudioName={referenceAudioName}
            referenceAudioUrl={referenceAudioUrl}
          />
          <SongVersionComparison
            currentSource={typedSong.chordpro_source}
            versions={(versions ?? []) as Version[]}
          />
          <SongReviewPanel
            songId={typedSong.id}
            canEdit={canEdit}
            initialStatus={(reviewThread?.status ?? "draft") as "draft" | "in_review" | "changes_requested" | "approved"}
            comments={reviewComments}
          />
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-[var(--brand)]" />
              <h2 className="font-semibold text-[var(--foreground)]">
                Tags
              </h2>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  No tags yet.
                </p>
              )}
            </div>

            {canEdit ? (
              <form action={setSongTags} className="mt-5 space-y-3">
                <input
                  type="hidden"
                  name="songId"
                  value={typedSong.id}
                />

                <div>
                  <label
                    htmlFor="tags"
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
                  >
                    Update tags
                  </label>

                  <input
                    id="tags"
                    name="tags"
                    defaultValue={tags
                      .map((tag) => tag.name)
                      .join(", ")}
                    placeholder="Worship, Slow, Communion"
                    maxLength={1000}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>

                <button
                  type="submit"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]"
                >
                  Save Tags
                </button>
              </form>
            ) : null}
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[var(--brand)]" />
              <h2 className="font-semibold text-[var(--foreground)]">
                Version History
              </h2>
            </div>

            <div className="mt-4 space-y-2">
              {(versions as Version[] | null)?.length ? (
                (versions as Version[]).map((version) => (
                  <Link
                    key={version.id}
                    href={`/songs/${typedSong.id}/versions/${version.id}`}
                    className="block rounded-2xl border border-[var(--border)] p-3 transition hover:bg-[var(--surface)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Version {version.version_number}
                      </span>

                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(version.created_at)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {version.current_key
                        ? `Key ${version.current_key}`
                        : "No key"}{" "}
                      {version.tempo
                        ? `• ${version.tempo} BPM`
                        : ""}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">
                  No version history available.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--foreground)]">
              Song Details
            </h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">Album</dt>
                <dd className="text-right font-medium text-[var(--foreground)]">
                  {typedSong.album || "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-[var(--muted)]">Last updated</dt>
                <dd className="text-right font-medium text-[var(--foreground)]">
                  {formatDate(typedSong.updated_at)}
                </dd>
              </div>
            </dl>

            {typedSong.notes ? (
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
                  {typedSong.notes}
                </p>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  )
}

export const metadata: Metadata = { title: "Song chart" }
