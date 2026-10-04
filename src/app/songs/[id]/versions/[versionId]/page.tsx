import Link from "next/link"
import {
  ArrowLeft,
  History,
  Music2,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import SongViewer from "@/components/songs/song-viewer"

type VersionPageProps = {
  params: Promise<{
    id: string
    versionId: string
  }>
}

export default async function SongVersionPage({
  params,
}: VersionPageProps) {
  const { id, versionId } = await params
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

  const { data: version, error: versionError } =
    await supabase
      .from("song_versions")
      .select(
        "id, song_id, version_number, title, artist, current_key, original_key, tempo, time_signature, capo, chordpro_source, notes, created_at"
      )
      .eq("id", versionId)
      .eq("song_id", id)
      .eq("organization_id", membership.organization_id)
      .maybeSingle()

  if (versionError) {
    throw new Error(
      `Unable to load song version: ${versionError.message}`
    )
  }

  if (!version) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/songs/${id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Current song
          </Link>

          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <History className="size-4" />
            Version {version.version_number}
          </div>
        </div>

        <header className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="hidden size-12 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] sm:flex">
              <Music2 className="size-6" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
                Saved version
              </div>

              <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                {version.title}
              </h1>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {version.artist || "Unknown artist"}
              </p>

              <p className="mt-3 text-xs text-[var(--muted)]">
                Version {version.version_number} · Saved{" "}
                {new Date(version.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6">
          <SongViewer
            source={version.chordpro_source}
            title={version.title}
          />
        </div>

        {version.notes ? (
          <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold">
              Arrangement notes
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
              {version.notes}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  )
}