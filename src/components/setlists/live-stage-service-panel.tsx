"use client"

import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  ListOrdered,
  MessageSquareText,
  Users,
  X,
  XCircle,
} from "lucide-react"

type TimelineItem = {
  id: string
  position: number
  item_type: string
  title: string
  duration_minutes: number | null
  notes: string | null
  song_id: string | null
}

type TeamMember = {
  id: string
  display_name: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
  response_note: string | null
}

type ServiceResource = {
  id: string
  display_name: string
  signed_url: string
}

type LiveStageServicePanelProps = {
  setlistId: string
  canManageCompletion: boolean
  isServiceCompleted: boolean
  serviceDate: string
  serviceTime: string
  status: string
  description: string | null
  serviceNotes: string | null
  announcements: string | null
  timeline: TimelineItem[]
  team: TeamMember[]
  resources: ServiceResource[]
  currentSongId: string | null
  songIndexById: Record<string, number>
  onSelectSong: (songId: string) => void
  onClose: () => void
}

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

const positionLabels: Record<string, string> = {
  worship_leader: "Worship Leader",
  singer: "Singer",
  lead_guitarist: "Lead Guitarist",
  rhythm_guitarist: "Rhythm Guitarist",
  acoustic_guitarist: "Acoustic Guitarist",
  electric_guitarist: "Electric Guitarist",
  bassist: "Bassist",
  keyboardist: "Keyboardist",
  pianist: "Pianist",
  drummer: "Drummer",
  percussionist: "Percussionist",
  violinist: "Violinist",
  cellist: "Cellist",
  sound_engineer: "Sound Engineer",
  audio_visual: "Audio / Visual",
  choir_member: "Choir Member",
  other: "Other",
}

export default function LiveStageServicePanel({
  setlistId,
  canManageCompletion,
  isServiceCompleted,
  serviceDate,
  serviceTime,
  status,
  description,
  serviceNotes,
  announcements,
  timeline,
  team,
  resources,
  currentSongId,
  songIndexById,
  onSelectSong,
  onClose,
}: LiveStageServicePanelProps) {
  const confirmedCount = team.filter(
    (member) => member.confirmation_status === "confirmed"
  ).length
  const pendingCount = team.filter(
    (member) => member.confirmation_status === "pending"
  ).length
  const declinedCount = team.filter(
    (member) => member.confirmation_status === "declined"
  ).length
  const totalMinutes = timeline.reduce(
    (sum, item) => sum + (item.duration_minutes ?? 0),
    0
  )

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/55">
      <button
        type="button"
        aria-label="Close service panel"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside
        className="relative flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#111713] text-white shadow-2xl"
        aria-label="Service information"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Service context
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">
                {status}
              </span>
              {serviceDate !== "No service date" ? (
                <span className="text-xs text-white/50">{serviceDate}</span>
              ) : null}
              {serviceTime ? (
                <span className="text-xs text-white/50">{serviceTime}</span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close service panel"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {description ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                Service description
              </p>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {description}
              </p>
            </section>
          ) : null}

          {serviceNotes || announcements ? (
            <section className={description ? "mt-6" : ""}>
              <div className="grid gap-3 sm:grid-cols-2">
                {serviceNotes ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="size-4 text-white/55" />
                      <h2 className="text-sm font-semibold">Service notes</h2>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/60">
                      {serviceNotes}
                    </p>
                  </div>
                ) : null}
                {announcements ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="size-4 text-white/55" />
                      <h2 className="text-sm font-semibold">Announcements</h2>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-white/60">
                      {announcements}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="size-4 text-white/55" />
                <h2 className="text-sm font-semibold">Run of show</h2>
              </div>
              {timeline.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/55">
                  <Clock3 className="size-3.5" />
                  {totalMinutes} min
                </span>
              ) : null}
            </div>

            {timeline.length > 0 ? (
              <ol className="mt-3 space-y-2">
                {timeline.map((item, index) => {
                  const linkedSongIndex =
                    item.song_id !== null
                      ? songIndexById[item.song_id]
                      : undefined
                  const isCurrent =
                    item.song_id !== null &&
                    item.song_id === currentSongId

                  return (
                    <li key={item.id}>
                      {linkedSongIndex !== undefined ? (
                        <button
                          type="button"
                          onClick={() => onSelectSong(item.song_id as string)}
                          className={
                            "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition " +
                            (isCurrent
                              ? "border-[var(--brand)]/60 bg-[var(--brand)]/15"
                              : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]")
                          }
                        >
                          <span
                            className={
                              "flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold " +
                              (isCurrent
                                ? "bg-[var(--brand)] text-white"
                                : "bg-white/10 text-white/55")
                            }
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white/85">
                                {item.title}
                              </span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/45">
                                {typeLabels[item.item_type] ?? "Other"}
                              </span>
                              {item.duration_minutes ? (
                                <span className="text-[10px] text-white/35">
                                  {item.duration_minutes} min
                                </span>
                              ) : null}
                            </span>
                            {item.notes ? (
                              <span className="mt-1 block text-xs leading-5 text-white/45">
                                {item.notes}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-[10px] font-semibold text-white/35">
                              {isCurrent ? "Now playing" : "Open chart"}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold text-white/55">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-white/80">
                                {item.title}
                              </span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/45">
                                {typeLabels[item.item_type] ?? "Other"}
                              </span>
                              {item.duration_minutes ? (
                                <span className="text-[10px] text-white/35">
                                  {item.duration_minutes} min
                                </span>
                              ) : null}
                            </div>
                            {item.notes ? (
                              <p className="mt-1 text-xs leading-5 text-white/45">
                                {item.notes}
                              </p>
                            ) : null}
                            {item.item_type === "song" ? (
                              <p className="mt-1 text-[10px] text-amber-200/70">
                                Link a setlist song to make this item navigable.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/45">
                No run-of-show items have been added to this service yet.
              </p>
            )}
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-white/55" />
                <h2 className="text-sm font-semibold">Team</h2>
              </div>
              {team.length > 0 ? (
                <span className="text-[10px] font-semibold text-white/40">
                  {confirmedCount} confirmed · {pendingCount} pending · {declinedCount} declined
                </span>
              ) : null}
            </div>

            {team.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {team.map((member) => {
                  const statusIcon =
                    member.confirmation_status === "confirmed"
                      ? <CheckCircle2 className="size-3.5" />
                      : member.confirmation_status === "declined"
                        ? <XCircle className="size-3.5" />
                        : <Clock3 className="size-3.5" />

                  const statusClass =
                    member.confirmation_status === "confirmed"
                      ? "bg-emerald-300/10 text-emerald-200"
                      : member.confirmation_status === "declined"
                        ? "bg-rose-300/10 text-rose-200"
                        : "bg-amber-300/10 text-amber-200"

                  return (
                    <li
                      key={member.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white/80">
                            {member.display_name}
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            {positionLabels[member.team_position] ??
                              member.team_position}
                          </p>
                        </div>
                        <span
                          className={
                            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold " +
                            statusClass
                          }
                        >
                          {statusIcon}
                          {member.confirmation_status === "confirmed"
                            ? "Confirmed"
                            : member.confirmation_status === "declined"
                              ? "Declined"
                              : "Pending"}
                        </span>
                      </div>
                      {member.response_note ? (
                        <p className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] leading-5 text-white/45">
                          {member.response_note}
                        </p>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/45">
                No team members are assigned to this service yet.
              </p>
            )}
          </section>

          <section className="mt-6 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-white/55" />
              <h2 className="text-sm font-semibold">Service resources</h2>
            </div>

            {resources.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {resources.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3.5 py-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/55">
                      <FileText className="size-3.5" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs font-medium text-white/75">
                      {resource.display_name}
                    </p>
                    <a
                      href={resource.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 shrink-0 items-center rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-xs leading-5 text-white/45">
                No resources are linked to this service.
              </p>
            )}
          </section>
        </div>
        {canManageCompletion ? (
          <footer className="shrink-0 border-t border-white/10 bg-black/20 px-5 py-4 sm:px-6">
            <Link
              href={"/setlists/" + setlistId + "/complete"}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ClipboardCheck className="size-4 shrink-0" />
                <span>
                  {isServiceCompleted
                    ? "Review service history"
                    : "Finish service & record notes"}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
            <p className="mt-2 text-xs leading-5 text-white/40">
              {isServiceCompleted
                ? "Completion is saved. Review attendance, duration, or after-service notes."
                : "After the service, record attendance, actual duration, and team notes."}
            </p>
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
