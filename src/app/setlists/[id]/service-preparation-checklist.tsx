"use client"

import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  ListMusic,
  Users,
} from "lucide-react"

type AssignmentStatus = "pending" | "confirmed" | "declined"

type ServicePreparationChecklistProps = {
  setlistId: string
  serviceDate: string | null
  serviceTime: string | null
  songCount: number
  teamAssignments: {
    confirmation_status: AssignmentStatus
  }[]
  timelineCount: number | null
  resourceCount: number | null
  hasServiceNotes: boolean
  hasAnnouncements: boolean
  canEdit: boolean
  isCompleted: boolean
}

type ChecklistItem = {
  label: string
  detail: string
  complete: boolean
  href?: string
  action?: string
}

function ChecklistRow({
  item,
}: {
  item: ChecklistItem
}) {
  const content = (
    <>
      <span
        className={
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl " +
          (item.complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-[var(--surface)] text-[var(--muted)]")
        }
      >
        {item.complete ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <Circle className="size-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">
          {item.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
          {item.detail}
        </span>
      </span>

      {item.href && item.action ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand)]">
          {item.action}
          <ArrowRight className="size-3.5" />
        </span>
      ) : null}
    </>
  )

  const className =
    "flex items-start gap-3 rounded-2xl border border-[var(--border)] p-3.5 transition " +
    (item.href
      ? "hover:border-[var(--brand)]/35 hover:bg-[var(--surface)]"
      : "bg-white")

  return item.href ? (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

export default function ServicePreparationChecklist({
  setlistId,
  serviceDate,
  serviceTime,
  songCount,
  teamAssignments,
  timelineCount,
  resourceCount,
  hasServiceNotes,
  hasAnnouncements,
  canEdit,
  isCompleted,
}: ServicePreparationChecklistProps) {
  const editHref = `/setlists/${setlistId}/edit`
  const teamCount = teamAssignments.length
  const confirmedCount = teamAssignments.filter(
    (assignment) =>
      assignment.confirmation_status === "confirmed"
  ).length
  const pendingCount = teamAssignments.filter(
    (assignment) =>
      assignment.confirmation_status === "pending"
  ).length
  const declinedCount = teamAssignments.filter(
    (assignment) =>
      assignment.confirmation_status === "declined"
  ).length

  const hasSchedule = Boolean(serviceDate && serviceTime)
  const hasSongs = songCount > 0
  const hasTeam = teamCount > 0
  const allConfirmed = hasTeam && confirmedCount === teamCount

  const coreItems: ChecklistItem[] = [
    {
      label: "Service date and time",
      detail: hasSchedule
        ? "The service schedule is set."
        : !serviceDate && !serviceTime
          ? "Add a date and start time so the team knows when to arrive."
          : !serviceDate
            ? "Add the service date."
            : "Add the service start time.",
      complete: hasSchedule,
      href: canEdit ? editHref : undefined,
      action: canEdit ? (hasSchedule ? "Review" : "Set schedule") : undefined,
    },
    {
      label: "Worship order",
      detail: hasSongs
        ? `${songCount} ${songCount === 1 ? "song is" : "songs are"} in the setlist.`
        : "Add at least one song to prepare the worship order.",
      complete: hasSongs,
      href: "#worship-order",
      action: "Review songs",
    },
    {
      label: "Worship team",
      detail: hasTeam
        ? `${teamCount} ${teamCount === 1 ? "position is" : "positions are"} assigned to this service.`
        : "Assign team members to their worship-team positions.",
      complete: hasTeam,
      href: "#worship-team",
      action: "Review team",
    },
    {
      label: "Team confirmations",
      detail: !hasTeam
        ? "Confirmations become available after team members are assigned."
        : declinedCount > 0
          ? `${declinedCount} declined; ${pendingCount} pending and ${confirmedCount} confirmed.`
          : pendingCount > 0
            ? `${confirmedCount} of ${teamCount} confirmed; ${pendingCount} still pending.`
            : `All ${teamCount} assigned ${teamCount === 1 ? "position is" : "positions are"} confirmed.`,
      complete: allConfirmed,
      href: "#worship-team",
      action: "View responses",
    },
  ]

  const completedChecks = coreItems.filter((item) => item.complete).length
  const completionPercent = Math.round(
    (completedChecks / coreItems.length) * 100
  )
  const isReady = completedChecks === coreItems.length

  const supportingItems: ChecklistItem[] = [
    {
      label: "Run of show",
      detail:
        timelineCount === null
          ? "Timeline data could not be checked. Verify that the service timeline migration is applied."
          : timelineCount > 0
            ? `${timelineCount} ${timelineCount === 1 ? "timeline item is" : "timeline items are"} planned.`
            : "Optional: outline opening, songs, prayer, message, and closing.",
      complete: timelineCount !== null && timelineCount > 0,
      href: "#service-timeline",
      action: timelineCount === null ? "Review" : timelineCount > 0 ? "Review timeline" : "Add timeline",
    },
    {
      label: "Service notes and announcements",
      detail:
        hasServiceNotes || hasAnnouncements
          ? "Service guidance has been added for the team."
          : "Optional: share service direction, reminders, or announcements.",
      complete: hasServiceNotes || hasAnnouncements,
      href:
        hasServiceNotes || hasAnnouncements
          ? "#service-notes"
          : canEdit
            ? editHref
            : undefined,
      action:
        hasServiceNotes || hasAnnouncements
          ? "Read notes"
          : canEdit
            ? "Add notes"
            : undefined,
    },
    {
      label: "Service resources",
      detail:
        resourceCount === null
          ? "Resource data could not be checked. Verify that the service resources migration is applied."
          : resourceCount > 0
            ? `${resourceCount} ${resourceCount === 1 ? "resource is" : "resources are"} linked to this service.`
            : "Optional: link rehearsal audio, documents, or other preparation files.",
      complete: resourceCount !== null && resourceCount > 0,
      href: "#service-resources",
      action: resourceCount === null ? "Review" : resourceCount > 0 ? "Review files" : "Link files",
    },
  ]

  return (
    <section
      id="service-preparation"
      aria-labelledby="service-preparation-title"
      className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h2
              id="service-preparation-title"
              className="text-lg font-semibold text-[var(--foreground)]"
            >
              Service preparation
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Track the essential steps and jump straight to anything that needs attention.
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-[var(--surface)] px-3.5 py-2.5">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {isCompleted
              ? "Service completed"
              : isReady
                ? "Core preparation complete"
                : "Preparation in progress"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {completedChecks} of {coreItems.length} essentials complete
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div
          className={
            "h-full rounded-full transition-all " +
            (isReady ? "bg-emerald-500" : completionPercent >= 50 ? "bg-amber-500" : "bg-rose-500")
          }
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {!isReady ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          Resolve the remaining essentials before service time. The additional preparation items below are recommended, but optional.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Schedule, song order, team assignments, and confirmations are all in place.
        </p>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {coreItems.map((item) => (
          <ChecklistRow key={item.label} item={item} />
        ))}
      </div>

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="size-4 text-[var(--muted)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Additional preparation
          </h3>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            Recommended
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {supportingItems.map((item) => (
            <ChecklistRow key={item.label} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
