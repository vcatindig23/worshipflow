import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Users,
} from "lucide-react"
import type { MemberAvailabilityAssessment } from "@/lib/member-availability"
import type { ServiceReadiness } from "@/lib/service-readiness"

type AssignmentStatus = "pending" | "confirmed" | "declined"

type TeamAssignmentSummary = {
  memberName: string
  teamPosition: string
  confirmation_status: AssignmentStatus
  availability: MemberAvailabilityAssessment | null
}

type TimelineSummary = {
  itemCount: number
  unlinkedSongCount: number
  untimedItemCount: number
}

type ServicePreparationChecklistProps = {
  setlistId: string
  serviceDate: string | null
  serviceTime: string | null
  songCount: number
  readiness: ServiceReadiness
  teamAssignments: TeamAssignmentSummary[]
  availabilityChecksAvailable: boolean
  timeline: TimelineSummary | null
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

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const content = (
    <>
      <span
        className={
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl " +
          (item.complete ? "wf-icon-tile wf-icon-tile-success" : "wf-icon-tile")
        }
      >
        {item.complete ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
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

function AvailabilityReview({
  assignments,
  checksAvailable,
}: {
  assignments: TeamAssignmentSummary[]
  checksAvailable: boolean
}) {
  if (assignments.length === 0) return null

  if (!checksAvailable) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <Users className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">Team availability</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Availability details are not available in this view. Review member responses and availability in the Worship Team section.
          </p>
        </div>
        <Link href="#worship-team" className="shrink-0 text-xs font-semibold text-[var(--brand)]">
          Review team
        </Link>
      </div>
    )
  }

  const unavailable = assignments.filter((item) => item.availability?.status === "unavailable")
  const outsideHours = assignments.filter((item) => item.availability?.status === "outside_weekly_hours")
  const needsSchedule = assignments.filter((item) => item.availability?.status === "needs_schedule")
  const notRecorded = assignments.filter((item) => item.availability?.status === "not_recorded")
  const withinHours = assignments.filter((item) => item.availability?.status === "within_weekly_hours")
  const needsReview = assignments.filter(
    (item) => item.availability && item.availability.status !== "within_weekly_hours"
  )

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Team availability</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Availability is reviewed separately from assignment confirmations.
          </p>
        </div>
        <Link href="#worship-team" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
          Review assignments <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 font-medium text-[var(--success)]">
          {withinHours.length} within usual hours
        </span>
        {unavailable.length > 0 ? (
          <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 font-medium text-[var(--danger)]">
            {unavailable.length} unavailable
          </span>
        ) : null}
        {outsideHours.length > 0 ? (
          <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 font-medium text-[var(--warning)]">
            {outsideHours.length} outside usual hours
          </span>
        ) : null}
        {needsSchedule.length > 0 ? (
          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--muted)]">
            {needsSchedule.length} need schedule details
          </span>
        ) : null}
        {notRecorded.length > 0 ? (
          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--muted)]">
            {notRecorded.length} with no availability details
          </span>
        ) : null}
      </div>

      {unavailable.length > 0 || outsideHours.length > 0 || needsSchedule.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          {needsReview
            .filter((item) =>
              ["unavailable", "outside_weekly_hours", "needs_schedule"].includes(
                item.availability?.status ?? ""
              )
            )
            .map((item) => (
              <li key={`${item.memberName}-${item.teamPosition}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-[var(--foreground)]">
                  {item.memberName} <span className="font-normal text-[var(--muted)]">· {item.teamPosition}</span>
                </span>
                <span
                  className={
                    item.availability?.status === "unavailable"
                      ? "font-semibold text-[var(--danger)]"
                      : "font-medium text-[var(--warning)]"
                  }
                >
                  {item.availability?.label}
                </span>
              </li>
            ))}
        </ul>
      ) : assignments.length > 0 ? (
        <p className="mt-3 text-xs text-[var(--success)]">No availability conflicts are currently flagged.</p>
      ) : null}
    </div>
  )
}

export default function ServicePreparationChecklist({
  setlistId,
  serviceDate,
  serviceTime,
  songCount,
  readiness,
  teamAssignments,
  availabilityChecksAvailable,
  timeline,
  resourceCount,
  hasServiceNotes,
  hasAnnouncements,
  canEdit,
  isCompleted,
}: ServicePreparationChecklistProps) {
  const editHref = `/setlists/${setlistId}/edit`
  const confirmedCount = readiness.confirmedAssignments
  const pendingCount = readiness.pendingAssignments
  const declinedCount = readiness.declinedAssignments
  const allConfirmed = readiness.hasTeam && !readiness.hasUnconfirmedTeam

  const coreItems: ChecklistItem[] = [
    {
      label: "Service date and time",
      detail: readiness.hasSchedule
        ? "The service schedule is set."
        : !serviceDate && !serviceTime
          ? "Add a date and start time so the team knows when to arrive."
          : !serviceDate
            ? "Add the service date."
            : "Add the service start time.",
      complete: readiness.hasSchedule,
      href: canEdit ? editHref : undefined,
      action: canEdit ? (readiness.hasSchedule ? "Review" : "Set schedule") : undefined,
    },
    {
      label: "Worship order",
      detail: readiness.hasSongs
        ? `${songCount} ${songCount === 1 ? "song is" : "songs are"} in the setlist.`
        : "Add at least one song to prepare the worship order.",
      complete: readiness.hasSongs,
      href: "#worship-order",
      action: "Review songs",
    },
    {
      label: "Worship team",
      detail: readiness.hasTeam
        ? `${readiness.totalAssignments} ${readiness.totalAssignments === 1 ? "position is" : "positions are"} assigned to this service.`
        : "Assign team members to their worship-team positions.",
      complete: readiness.hasTeam,
      href: "#worship-team",
      action: "Review team",
    },
    {
      label: "Team confirmations",
      detail: !readiness.hasTeam
        ? "Confirmations become available after team members are assigned."
        : declinedCount > 0
          ? `${declinedCount} declined; ${pendingCount} pending and ${confirmedCount} confirmed.`
          : pendingCount > 0
            ? `${confirmedCount} of ${readiness.totalAssignments} confirmed; ${pendingCount} still pending.`
            : `All ${readiness.totalAssignments} assigned ${readiness.totalAssignments === 1 ? "position is" : "positions are"} confirmed.`,
      complete: allConfirmed,
      href: "#worship-team",
      action: "View responses",
    },
  ]

  const timelineCount = timeline?.itemCount ?? null
  const timelineDetail =
    timeline === null
      ? "Timeline details could not be checked. Open the service timeline to review it."
      : timeline.itemCount === 0
        ? "Recommended: add the opening, worship order, prayer, message, and closing to the run of show."
        : [
            `${timeline.itemCount} ${timeline.itemCount === 1 ? "item is" : "items are"} planned.`,
            timeline.unlinkedSongCount > 0
              ? `${timeline.unlinkedSongCount} song ${timeline.unlinkedSongCount === 1 ? "item is" : "items are"} not linked to a setlist chart.`
              : null,
            timeline.untimedItemCount > 0
              ? `${timeline.untimedItemCount} ${timeline.untimedItemCount === 1 ? "item has" : "items have"} no planned duration.`
              : null,
          ].filter(Boolean).join(" ")
  const supportingItems: ChecklistItem[] = [
    {
      label: "Run of show",
      detail: timelineDetail,
      complete: timelineCount !== null && timelineCount > 0 && timeline!.unlinkedSongCount === 0,
      href: "#service-timeline",
      action: timelineCount === null ? "Review" : timelineCount > 0 ? "Review timeline" : "Add timeline",
    },
    {
      label: "Service notes and announcements",
      detail: hasServiceNotes || hasAnnouncements
        ? "Service guidance has been added for the team."
        : "Recommended: share service direction, reminders, or announcements.",
      complete: hasServiceNotes || hasAnnouncements,
      href: hasServiceNotes || hasAnnouncements ? "#service-notes" : canEdit ? editHref : undefined,
      action: hasServiceNotes || hasAnnouncements ? "Read notes" : canEdit ? "Add notes" : undefined,
    },
    {
      label: "Service resources",
      detail: resourceCount === null
        ? "Resource details could not be checked. Open the shared resources section to review."
        : resourceCount > 0
          ? `${resourceCount} ${resourceCount === 1 ? "resource is" : "resources are"} linked to this service.`
          : "Recommended: link rehearsal audio, documents, or other preparation files.",
      complete: resourceCount !== null && resourceCount > 0,
      href: "#service-resources",
      action: resourceCount === null ? "Review" : resourceCount > 0 ? "Review files" : "Link files",
    },
  ]

  const isReady = readiness.status === "ready"
  const unavailableCount = teamAssignments.filter(
    (assignment) => assignment.availability?.status === "unavailable"
  ).length

  return (
    <section
      id="service-preparation"
      aria-labelledby="service-preparation-title"
      className="scroll-mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm md:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h2 id="service-preparation-title" className="text-lg font-semibold text-[var(--foreground)]">
              Service preparation overview
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Review the essentials, team responses, availability, and run of show from one place.
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-[var(--surface)] px-3.5 py-2.5">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {isCompleted ? "Service completed" : isReady ? "Core preparation complete" : "Preparation in progress"}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {readiness.completedChecks} of {readiness.totalChecks} essentials complete · {readiness.percentage}%
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-label="Core service preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={readiness.percentage}>
        <div
          className={"origin-left h-full rounded-full transition-transform " + (isReady ? "bg-[var(--success)]" : readiness.percentage >= 50 ? "bg-[var(--warning)]" : "bg-[var(--danger)]")}
          style={{ transform: `scaleX(${readiness.percentage / 100})` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 font-semibold text-[var(--danger)]">
          {coreItems.filter((item) => !item.complete).length} essential checks need attention
        </span>
        {unavailableCount > 0 ? (
          <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 font-semibold text-[var(--danger)]">
            {unavailableCount} unavailable assignment{unavailableCount === 1 ? "" : "s"}
          </span>
        ) : null}
        <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 font-medium text-[var(--muted)]">
          Timeline and resources are recommendations
        </span>
      </div>

      {isCompleted ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
          This service is marked complete. The overview reflects the preparation details currently saved in the plan.
        </p>
      ) : !isReady || unavailableCount > 0 ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
          Resolve essential gaps and review any availability concerns before service time. Recommended items can improve coordination but do not block publishing.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--success)]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          Schedule, song order, team assignments, and confirmations are all in place.
        </p>
      )}

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Essential readiness checks</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {coreItems.map((item) => <ChecklistRow key={item.label} item={item} />)}
        </div>
      </div>

      <AvailabilityReview assignments={teamAssignments} checksAvailable={availabilityChecksAvailable} />

      <div className="mt-6 border-t border-[var(--border)] pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FileText className="size-4 text-[var(--muted)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Recommended preparation</h3>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">Optional</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {supportingItems.map((item) => <ChecklistRow key={item.label} item={item} />)}
        </div>
      </div>
    </section>
  )
}
