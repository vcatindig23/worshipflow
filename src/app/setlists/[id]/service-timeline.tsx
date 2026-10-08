import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Link2,
  ListOrdered,
  Trash2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import {
  addTimelineItem,
  moveTimelineItem,
  removeTimelineItem,
} from "./timeline-actions"

const typeLabels: Record<string, string> = {
  opening: "Opening",
  welcome: "Welcome",
  song: "Song",
  prayer: "Prayer",
  offering: "Offering",
  announcements: "Announcements",
  message: "Message",
  communion: "Communion",
  closing: "Closing",
  transition: "Transition",
  other: "Other",
}

type TimelineItem = {
  id: string
  position: number
  item_type: string
  title: string
  duration_minutes: number | null
  notes: string | null
  song_id: string | null
}

type SetlistSongOption = {
  song_id: string
  title: string
  artist: string | null
}

export default async function ServiceTimeline({
  setlistId,
  canEdit,
}: {
  setlistId: string
  canEdit: boolean
}) {
  const workspace = await getWorkspace()
  if (!workspace) return null

  const supabase = await createClient()

  const [{ data: timelineData }, { data: setlistSongsData }] =
    await Promise.all([
      supabase
        .from("setlist_timeline_items")
        .select(
          "id, position, item_type, title, duration_minutes, notes, song_id"
        )
        .eq("setlist_id", setlistId)
        .eq("organization_id", workspace.organizationId)
        .order("position", { ascending: true }),
      supabase
        .from("setlist_songs")
        .select("song_id")
        .eq("setlist_id", setlistId)
        .order("position", { ascending: true }),
    ])

  const items = (timelineData ?? []) as TimelineItem[]
  const setlistSongIds = (setlistSongsData ?? []).map(
    (song) => song.song_id as string
  )

  let songOptions: SetlistSongOption[] = []
  if (setlistSongIds.length > 0) {
    const { data: songs } = await supabase
      .from("songs")
      .select("id, title, artist")
      .in("id", setlistSongIds)
      .eq("organization_id", workspace.organizationId)

    const titlesById = new Map(
      (songs ?? []).map((song) => [song.id, song])
    )

    songOptions = setlistSongIds
      .map((songId) => {
        const song = titlesById.get(songId)
        return song
          ? {
              song_id: song.id,
              title: song.title,
              artist: song.artist,
            }
          : null
      })
      .filter(
        (song): song is SetlistSongOption => song !== null
      )
  }

  const totalMinutes = items.reduce(
    (sum, item) => sum + (item.duration_minutes ?? 0),
    0
  )

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-[var(--brand)]" />
            <h2 className="font-semibold text-[var(--foreground)]">
              Service Timeline
            </h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Build the running order for worship, prayer, announcements, message, and other service moments.
          </p>
        </div>
        {items.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
            <Clock3 className="size-3.5" />
            {totalMinutes} min planned
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {items.map((item, index) => {
            const linkedSong = item.song_id
              ? songOptions.find((song) => song.song_id === item.song_id)
              : null

            return (
              <li
                key={item.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {item.title}
                      </h3>
                      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">
                        {typeLabels[item.item_type] ?? "Other"}
                      </span>
                      {item.duration_minutes ? (
                        <span className="text-xs text-[var(--muted)]">
                          {item.duration_minutes} min
                        </span>
                      ) : null}
                    </div>
                    {linkedSong ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)]">
                        <Link2 className="size-3.5" />
                        Linked to {linkedSong.title}
                      </p>
                    ) : item.item_type === "song" ? (
                      <p className="mt-2 text-xs text-amber-700">
                        This song timeline item is not linked to a setlist chart yet.
                      </p>
                    ) : null}
                    {item.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                        {item.notes}
                      </p>
                    ) : null}
                  </div>

                  {canEdit ? (
                    <div className="flex shrink-0 items-start gap-1">
                      <form action={moveTimelineItem}>
                        <input type="hidden" name="setlistId" value={setlistId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label="Move timeline item up"
                          className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                      </form>
                      <form action={moveTimelineItem}>
                        <input type="hidden" name="setlistId" value={setlistId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === items.length - 1}
                          aria-label="Move timeline item down"
                          className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--muted)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </form>
                      <form action={removeTimelineItem}>
                        <input type="hidden" name="setlistId" value={setlistId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${item.title}`}
                          className="flex size-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="mt-5 rounded-2xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
          No timeline items have been added yet.
        </div>
      )}

      {canEdit ? (
        <form
          action={addTimelineItem}
          className="mt-5 space-y-3 border-t border-[var(--border)] pt-5"
        >
          <input type="hidden" name="setlistId" value={setlistId} />

          <div className="grid gap-3 md:grid-cols-[1fr_180px_140px]">
            <div>
              <label
                htmlFor={`timeline-title-${setlistId}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                Item
              </label>
              <input
                id={`timeline-title-${setlistId}`}
                name="title"
                required
                maxLength={160}
                placeholder="e.g. Opening Prayer"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div>
              <label
                htmlFor={`timeline-type-${setlistId}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                Type
              </label>
              <select
                id={`timeline-type-${setlistId}`}
                name="itemType"
                defaultValue="other"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor={`timeline-duration-${setlistId}`}
                className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                Minutes
              </label>
              <input
                id={`timeline-duration-${setlistId}`}
                name="durationMinutes"
                type="number"
                min={1}
                max={240}
                placeholder="Optional"
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>

          {songOptions.length > 0 ? (
            <div>
              <label
                htmlFor={`timeline-song-${setlistId}`}
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
              >
                <Link2 className="size-3.5" />
                Link to setlist song
              </label>
              <select
                id={`timeline-song-${setlistId}`}
                name="songId"
                defaultValue=""
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
              >
                <option value="">No song link</option>
                {songOptions.map((song) => (
                  <option key={song.song_id} value={song.song_id}>
                    {song.title}
                    {song.artist ? ` — ${song.artist}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                Link a Song item to its chart so Live Stage can jump directly to it.
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor={`timeline-notes-${setlistId}`}
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Notes
            </label>
            <textarea
              id={`timeline-notes-${setlistId}`}
              name="notes"
              maxLength={1000}
              rows={2}
              placeholder="Optional direction for the team"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>

          <button
            type="submit"
            className="h-10 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Add to Timeline
          </button>
        </form>
      ) : null}
    </section>
  )
}
