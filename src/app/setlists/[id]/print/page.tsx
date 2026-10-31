import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Clock3, FileText, MapPin, Music2, Users } from "lucide-react"
import { notFound, redirect } from "next/navigation"
import PrintServicePlanButton from "@/components/setlists/print-service-plan-button"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { teamPositionLabels } from "@/lib/team-positions"

type Setlist = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  end_time: string | null
  service_type: string
  location: string | null
  theme: string | null
  service_notes: string | null
  announcements: string | null
  rehearsal_date: string | null
  rehearsal_time: string | null
  rehearsal_end_time: string | null
  rehearsal_location: string | null
  rehearsal_notes: string | null
  status: string
}

type ServiceSong = {
  id: string
  song_id: string
  position: number
  section: string
  key_override: string | null
  capo_override: number | null
  tempo_override: number | null
  notes: string | null
}

type Song = {
  id: string
  title: string
  artist: string | null
  current_key: string | null
  tempo: number | null
  capo: number | null
}

type TimelineItem = {
  id: string
  position: number
  item_type: string
  title: string
  duration_minutes: number | null
  notes: string | null
}

type Assignment = {
  id: string
  user_id: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
  response_note: string | null
}

type PreparationTask = {
  id: string
  title: string
  details: string | null
  is_completed: boolean
  position: number
}

const timelineLabels: Record<string, string> = {
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

function formatDate(value: string | null) {
  if (!value) return "Date not set"
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "full" }).format(new Date(`${value}T00:00:00`))
}

function formatShortDate(value: string | null) {
  if (!value) return "Not scheduled"
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
}

function formatTime(value: string | null) {
  if (!value) return "Time not set"
  const date = new Date(`2000-01-01T${value.slice(0, 8)}`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date)
}

function statusLabel(value: Assignment["confirmation_status"]) {
  if (value === "confirmed") return "Confirmed"
  if (value === "declined") return "Declined"
  return "Pending"
}

export default async function PrintServicePlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")

  const supabase = await createClient()
  const { data: rawSetlist, error: setlistError } = await supabase
    .from("setlists")
    .select("id, name, description, service_date, service_time, end_time, service_type, location, theme, service_notes, announcements, rehearsal_date, rehearsal_time, rehearsal_end_time, rehearsal_location, rehearsal_notes, status")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (setlistError) redirect(`/setlists/${id}?error=setlist_load_failed`)
  if (!rawSetlist) notFound()
  const setlist = rawSetlist as Setlist

  const [songsResult, timelineResult, assignmentResult, resourcesResult, tasksResult] = await Promise.all([
    supabase
      .from("setlist_songs")
      .select("id, song_id, position, section, key_override, capo_override, tempo_override, notes")
      .eq("setlist_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("setlist_timeline_items")
      .select("id, position, item_type, title, duration_minutes, notes")
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("position", { ascending: true }),
    supabase
      .from("setlist_team_assignments")
      .select("id, user_id, team_position, confirmation_status, response_note")
      .eq("setlist_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("setlist_resources")
      .select("id, display_name")
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("setlist_preparation_tasks")
      .select("id, title, details, is_completed, position")
      .eq("setlist_id", id)
      .eq("organization_id", workspace.organizationId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ])

  if (songsResult.error || timelineResult.error || assignmentResult.error || resourcesResult.error || tasksResult.error) {
    redirect(`/setlists/${id}?error=setlist_load_failed`)
  }

  const setlistSongs = (songsResult.data ?? []) as ServiceSong[]
  const songIds = [...new Set(setlistSongs.map((song) => song.song_id))]
  let songsById = new Map<string, Song>()
  if (songIds.length > 0) {
    const { data: songs, error } = await supabase
      .from("songs")
      .select("id, title, artist, current_key, tempo, capo")
      .in("id", songIds)
      .eq("organization_id", workspace.organizationId)
    if (error) redirect(`/setlists/${id}?error=setlist_load_failed`)
    songsById = new Map(((songs ?? []) as Song[]).map((song) => [song.id, song]))
  }

  const assignments = (assignmentResult.data ?? []) as Assignment[]
  const memberIds = [...new Set(assignments.map((assignment) => assignment.user_id))]
  let namesById = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberIds)
    namesById = new Map((profiles ?? []).map((profile) => [
      profile.id,
      profile.display_name?.trim() || "Team member",
    ]))
  }

  const timeline = (timelineResult.data ?? []) as TimelineItem[]
  const resources = resourcesResult.data ?? []
  const tasks = (tasksResult.data ?? []) as PreparationTask[]
  const totalPlannedMinutes = timeline.reduce((sum, item) => sum + (item.duration_minutes ?? 0), 0)

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-6 text-slate-900 sm:px-8 print:max-w-none print:space-y-5 print:px-0 print:py-0">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link href={`/setlists/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="size-4" /> Back to service
        </Link>
        <PrintServicePlanButton />
      </div>

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:rounded-none print:border-b-2 print:border-x-0 print:border-t-0 print:p-0 print:pb-5 print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{workspace.organizationName}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl print:text-3xl">{setlist.name}</h1>
            {setlist.theme ? <p className="mt-2 text-base font-medium text-slate-700">{setlist.theme}</p> : null}
            {setlist.description ? <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{setlist.description}</p> : null}
          </div>
          <div className="shrink-0 rounded-2xl bg-slate-50 p-4 sm:min-w-52 print:border print:border-slate-200 print:bg-white">
            <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-slate-500" /> {formatDate(setlist.service_date)}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Clock3 className="size-4 text-slate-500" /> {formatTime(setlist.service_time)}{setlist.end_time ? ` – ${formatTime(setlist.end_time)}` : ""}</p>
            {setlist.location ? <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4 text-slate-500" /> {setlist.location}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{setlist.status}</p>
          </div>
        </div>
      </header>

      {(setlist.announcements || setlist.service_notes) ? (
        <section className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {setlist.announcements ? (
            <article className="break-inside-avoid rounded-2xl border border-slate-200 p-4 print:rounded-none">
              <h2 className="text-sm font-bold">Announcements</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{setlist.announcements}</p>
            </article>
          ) : null}
          {setlist.service_notes ? (
            <article className="break-inside-avoid rounded-2xl border border-slate-200 p-4 print:rounded-none">
              <h2 className="text-sm font-bold">Service notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{setlist.service_notes}</p>
            </article>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Music2 className="size-5 text-slate-500" /> Worship order</h2>
          <span className="text-xs text-slate-500">{setlistSongs.length} songs</span>
        </div>
        {setlistSongs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No songs have been added.</p>
        ) : (
          <ol className="mt-4 divide-y divide-slate-200">
            {setlistSongs.map((item, index) => {
              const song = songsById.get(item.song_id)
              return (
                <li key={item.id} className="break-inside-avoid py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold">{song?.title ?? "Unavailable song"}</h3>
                        {song?.artist ? <span className="text-xs text-slate-500">{song.artist}</span> : null}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{item.section}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Key: {item.key_override ?? song?.current_key ?? "—"}
                        {" · "}Capo: {item.capo_override ?? song?.capo ?? 0}
                        {" · "}Tempo: {(item.tempo_override ?? song?.tempo) ? `${item.tempo_override ?? song?.tempo} BPM` : "—"}
                      </p>
                      {item.notes ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">Arrangement: {item.notes}</p> : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {timeline.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Run of show</h2>
            <span className="text-xs text-slate-500">{totalPlannedMinutes} min planned</span>
          </div>
          <ol className="mt-4 space-y-3">
            {timeline.map((item, index) => (
              <li key={item.id} className="break-inside-avoid flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{timelineLabels[item.item_type] ?? "Other"}</span>
                    {item.duration_minutes ? <span className="text-xs text-slate-500">{item.duration_minutes} min</span> : null}
                  </div>
                  {item.notes ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.notes}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5 text-slate-500" /> Team assignments</h2>
        {assignments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No team members assigned.</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 print:grid-cols-2">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="break-inside-avoid flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 print:rounded-none">
                <div>
                  <p className="text-sm font-semibold">{namesById.get(assignment.user_id) ?? "Team member"}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{teamPositionLabels[assignment.team_position] ?? assignment.team_position}</p>
                  {assignment.response_note ? <p className="mt-1 text-xs text-slate-500">{assignment.response_note}</p> : null}
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{statusLabel(assignment.confirmation_status)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {(setlist.rehearsal_date || setlist.rehearsal_time || setlist.rehearsal_location || setlist.rehearsal_notes) ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
          <h2 className="text-lg font-bold">Rehearsal plan</h2>
          <p className="mt-2 text-sm text-slate-700">
            {formatShortDate(setlist.rehearsal_date)} · {formatTime(setlist.rehearsal_time)}
            {setlist.rehearsal_end_time ? ` – ${formatTime(setlist.rehearsal_end_time)}` : ""}
          </p>
          {setlist.rehearsal_location ? <p className="mt-1 text-sm text-slate-600">Location: {setlist.rehearsal_location}</p> : null}
          {setlist.rehearsal_notes ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{setlist.rehearsal_notes}</p> : null}
        </section>
      ) : null}

      {tasks.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
          <h2 className="flex items-center gap-2 text-lg font-bold"><FileText className="size-5 text-slate-500" /> Preparation checklist</h2>
          <ul className="mt-4 space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="break-inside-avoid flex items-start gap-2 text-sm">
                <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-[10px]">{task.is_completed ? "✓" : ""}</span>
                <span className={task.is_completed ? "text-slate-500 line-through" : ""}>
                  <span className="font-medium">{task.title}</span>
                  {task.details ? <span className="block text-xs leading-5 text-slate-500">{task.details}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {resources.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 print:rounded-none print:p-0 print:border-0">
          <h2 className="text-lg font-bold">Service resources</h2>
          <ul className="mt-3 space-y-1.5">
            {resources.map((resource) => (
              <li key={resource.id} className="text-sm text-slate-700">• {resource.display_name}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500 print:mt-3">
        Prepared in WorshipFlow · {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: workspace.organizationTimezone }).format(new Date())}
      </footer>
    </main>
  )
}


export const metadata: Metadata = { title: "Print service plan" }
