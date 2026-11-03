import { PageHeader } from "@/components/ui/page"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  ListMusic,
  Music2,
  Plus,
  Settings,
  UsersRound,
} from "lucide-react"
import { getTeamPositionLabel } from "@/lib/team-positions"
import { editorRoles, leaderRoles } from "@/lib/permissions"
import ProfileAvatar from "@/components/profile-avatar"
import type { WorkspaceData } from "@/lib/workspace/get-workspace"
import { getDashboardSetlistPriority } from "@/lib/dashboard-priorities"
import DashboardGuidedTour from "@/components/dashboard-guided-tour"
import AssignmentConfirmation from "@/app/my-schedule/assignment-confirmation"
import WorshipFlowShell from "@/components/worshipflow-shell"

type DashboardViewProps = {
  workspace: WorkspaceData
}

type DashboardAction = {
  title: string
  description: string
  actionLabel: string
  href: string
  context?: string
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatServiceTime(time: string | null) {
  if (!time) return null

  const [hoursString, minutesString] = time.split(":")
  const hours = Number(hoursString)
  const minutes = (minutesString ?? "00").slice(0, 2)

  if (Number.isNaN(hours)) return time

  const period = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12

  return `${displayHour}:${minutes} ${period}`
}

function formatDay(day: number) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]

  return days[day] ?? "Sunday"
}

function formatServiceDate(day: string | null) {
  if (!day) return "Date not set"

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`))
}

export default function DashboardView({ workspace }: DashboardViewProps) {
  const isTeamLeader = leaderRoles.includes(workspace.role)
  const canEditServices = editorRoles.includes(workspace.role)
  const firstIncompleteService = workspace.upcomingSetlists.find(
    (setlist) => setlist.readiness.status !== "ready",
  )
  const firstServiceNeedingAssignments = workspace.upcomingSetlists.find(
    (setlist) => setlist.readiness.totalAssignments === 0,
  )
  const pendingMyConfirmations = workspace.myUpcomingAssignments.reduce(
    (total, assignment) =>
      total +
      assignment.confirmations.filter(
        (confirmation) => confirmation.status === "pending",
      ).length,
    0,
  )
  const pendingTeamConfirmations = workspace.upcomingSetlists.reduce(
    (total, setlist) => total + setlist.readiness.pendingAssignments,
    0,
  )
  const declinedTeamConfirmations = workspace.upcomingSetlists.reduce(
    (total, setlist) => total + setlist.readiness.declinedAssignments,
    0,
  )

  let nextAction: DashboardAction

  if (canEditServices && workspace.upcomingSetlists.length > 0) {
    if (firstIncompleteService) {
      const priority = getDashboardSetlistPriority(
        firstIncompleteService,
        canEditServices,
      )
      nextAction = {
        title: priority.title,
        description: priority.description,
        actionLabel: priority.actionLabel,
        href: priority.href,
        context: firstIncompleteService.name,
      }
    } else {
      nextAction = {
        title: "Your upcoming services are ready",
        description:
          "The next scheduled services have their essentials in place. Review the next plan or prepare another service.",
        actionLabel: "Plan another service",
        href: "/setlists/new",
        context: workspace.upcomingSetlists[0]?.name,
      }
    }
  } else if (canEditServices && workspace.songCount === 0) {
    nextAction = {
      title: "Create your first song chart",
      description:
        "Start your shared worship library with lyrics, chords, key, and tempo.",
      actionLabel: "Create a song",
      href: "/songs/new",
    }
  } else if (canEditServices) {
    nextAction = {
      title: "Plan your next worship service",
      description:
        "Create a dated setlist, arrange the worship order, and coordinate the people serving.",
      actionLabel: "Create a setlist",
      href: "/setlists/new",
    }
  } else if (pendingMyConfirmations > 0) {
    nextAction = {
      title: `Confirm ${pendingMyConfirmations} upcoming ${pendingMyConfirmations === 1 ? "assignment" : "assignments"}`,
      description:
        "Let your worship leader know which services you can serve at.",
      actionLabel: "Go to confirmations",
      href: "#your-upcoming-assignments",
    }
  } else if (workspace.myUpcomingAssignments.length > 0) {
    const nextAssignment = workspace.myUpcomingAssignments[0]
    nextAction = {
      title: "Get ready for your next service",
      description: "Review the service plan and the positions you are serving in.",
      actionLabel: "Open service plan",
      href: `/setlists/${nextAssignment.id}`,
      context: nextAssignment.name,
    }
  } else {
    nextAction = {
      title: "Check your upcoming schedule",
      description:
        "Open My Schedule to review your commitments and keep your availability up to date.",
      actionLabel: "Open My Schedule",
      href: "/my-schedule",
    }
  }

  const firstAssignmentService = firstServiceNeedingAssignments ??
    workspace.upcomingSetlists[0]
  const gettingStartedSteps = [
    {
      title: "Add your first song",
      description: "Create a chart your worship team can use.",
      complete: workspace.songCount > 0,
      href: workspace.songCount > 0 ? "/songs" : "/songs/new",
      action: workspace.songCount > 0 ? "View songs" : "Add song",
      icon: <Music2 className="size-4" />,
    },
    {
      title: "Create your first setlist",
      description: "Plan a dated worship service.",
      complete: workspace.setlistCount > 0,
      href: "/setlists/new",
      action: workspace.setlistCount > 0 ? "Plan another" : "Create setlist",
      icon: <ListMusic className="size-4" />,
    },
    {
      title: "Invite your team",
      description: "Bring your musicians and vocalists into the workspace.",
      complete: workspace.memberCount > 1,
      href: "/settings/team",
      action: workspace.memberCount > 1 ? "Manage team" : "Invite teammate",
      icon: <UsersRound className="size-4" />,
    },
    {
      title: "Make your first assignment",
      description: "Assign a teammate to a position on an upcoming service.",
      complete: workspace.upcomingSetlists.some(
        (setlist) => setlist.readiness.totalAssignments > 0,
      ),
      href: firstAssignmentService
        ? `/setlists/${firstAssignmentService.id}#worship-team`
        : "/setlists/new",
      action: firstAssignmentService ? "Assign a teammate" : "Plan a service first",
      icon: <CheckCircle2 className="size-4" />,
    },
  ]
  const showGettingStarted =
    workspace.role === "admin" &&
    gettingStartedSteps.some((step) => !step.complete)

  return (
    <WorshipFlowShell
      workspace={{
        userName: workspace.userName,
        userAvatarUrl: workspace.userAvatarUrl,
        role: workspace.role,
        organizationName: workspace.organizationName,
        unreadChatNotificationCount: workspace.unreadChatNotificationCount,
      }}
    >
      <main id="main-content" className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto max-w-[80rem]">
          <div data-tour="dashboard-welcome" className="mb-6">
            <PageHeader
              title={
                <span className="block break-words [overflow-wrap:anywhere]">
                  {workspace.organizationName}
                </span>
              }
              eyebrow={<>Welcome back, {workspace.userName}</>}
              description={
                isTeamLeader
                  ? "See what needs attention and keep your next worship services moving."
                  : "Your worship workspace, upcoming commitments, and the next step to take."
              }
              actions={<DashboardGuidedTour userId={workspace.userId} />}
            />
          </div>

          {!workspace.serviceTimeAvailable ? (
            <div className="wf-feedback wf-feedback-warning mb-5">
              <p className="break-words">
                Service start times are temporarily unavailable. Apply{" "}
                <code className="font-semibold">
                  20261007100419_add_setlist_service_time.sql
                </code>{" "}
                to the Supabase database to enable them.
              </p>
            </div>
          ) : null}

          <section
            data-tour="dashboard-next-action"
            aria-labelledby="dashboard-next-action-title"
            className="wf-card grid min-w-0 gap-5 border-[var(--brand)]/20 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="wf-icon-tile flex size-11 shrink-0 items-center justify-center">
                {isTeamLeader ? (
                  <CircleAlert className="size-5" />
                ) : pendingMyConfirmations > 0 ? (
                  <Clock3 className="size-5" />
                ) : (
                  <CalendarDays className="size-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
                  Your next step
                </p>
                <h2
                  id="dashboard-next-action-title"
                  className="mt-1 break-words text-lg font-semibold tracking-[-0.02em] sm:text-xl [overflow-wrap:anywhere]"
                >
                  {nextAction.title}
                </h2>
                <p className="mt-1 max-w-2xl break-words text-sm leading-6 text-[var(--muted)]">
                  {nextAction.description}
                </p>
                {nextAction.context ? (
                  <p className="mt-2 break-words text-xs font-semibold text-[var(--foreground)]">
                    {nextAction.context}
                  </p>
                ) : null}
              </div>
            </div>

            <Link
              href={nextAction.href}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
            >
              {nextAction.actionLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </section>

          <nav
            aria-label="Dashboard shortcuts"
            className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold"
          >
            <Link
              href="/songs/new"
              data-tour="create-song"
              className="inline-flex min-h-9 items-center gap-1.5 text-[var(--brand)] transition hover:underline"
            >
              <Plus className="size-3.5" />
              Add a song
            </Link>
            {canEditServices ? (
              <Link
                href="/setlists/new"
                data-tour="build-setlist"
                className="inline-flex min-h-9 items-center gap-1.5 text-[var(--brand)] transition hover:underline"
              >
                <ListMusic className="size-3.5" />
                Plan a service
              </Link>
            ) : (
              <Link
                href="/my-schedule"
                className="inline-flex min-h-9 items-center gap-1.5 text-[var(--brand)] transition hover:underline"
              >
                <CalendarDays className="size-3.5" />
                My Schedule
              </Link>
            )}
            {workspace.role === "admin" ? (
              <Link
                href="/settings/team"
                className="inline-flex min-h-9 items-center gap-1.5 text-[var(--brand)] transition hover:underline"
              >
                <UsersRound className="size-3.5" />
                Invite people
              </Link>
            ) : null}
          </nav>

          {showGettingStarted ? (
            <section
              aria-labelledby="dashboard-getting-started-title"
              className="mt-6 wf-card overflow-hidden"
            >
              <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
                  Getting started
                </p>
                <h2
                  id="dashboard-getting-started-title"
                  className="mt-1 text-base font-semibold"
                >
                  Build your worship workspace
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Follow these first steps to bring your songs, service plans, and team together.
                </p>
              </div>
              <ol className="grid gap-px bg-[var(--border)] sm:grid-cols-2">
                {gettingStartedSteps.map((step, index) => (
                  <li key={step.title} className="min-w-0 bg-[var(--card)]">
                    <Link
                      href={step.href}
                      className="flex h-full min-w-0 items-start gap-3 px-5 py-4 transition hover:bg-[var(--surface)] sm:px-6"
                    >
                      <span
                        className={
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl " +
                          (step.complete
                            ? "wf-icon-tile wf-icon-tile-success"
                            : "wf-icon-tile")
                        }
                      >
                        {step.complete ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          step.icon
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold text-[var(--muted)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="break-words text-sm font-semibold [overflow-wrap:anywhere]">
                            {step.title}
                          </span>
                          {step.complete ? (
                            <span className="wf-status wf-status-success">
                              Done
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-5 text-[var(--muted)]">
                          {step.description}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                          {step.action}
                          <ChevronRight className="size-3.5" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {isTeamLeader ? (
            <section
              data-tour="team-priorities"
              aria-labelledby="dashboard-priorities-title"
              className="mt-6 wf-card overflow-hidden"
            >
              <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <h2
                    id="dashboard-priorities-title"
                    className="text-base font-semibold"
                  >
                    Team priorities
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Open a service issue directly instead of searching through the schedule.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-[var(--muted)]">
                  <span>
                    <strong className="text-[var(--foreground)] tabular-nums">
                      {pendingTeamConfirmations}
                    </strong>{" "}
                    awaiting
                  </span>
                  <span>
                    <strong className="text-[var(--foreground)] tabular-nums">
                      {declinedTeamConfirmations}
                    </strong>{" "}
                    declined
                  </span>
                </div>
              </div>

              {workspace.upcomingSetlists.length === 0 ? (
                <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      No upcoming services to coordinate
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      Create a dated setlist to start preparing your next service.
                    </p>
                  </div>
                  {canEditServices ? (
                    <Link
                      href="/setlists/new"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      <Plus className="size-3.5" />
                      Plan a service
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {workspace.upcomingSetlists.map((setlist) => {
                    const priority = getDashboardSetlistPriority(
                      setlist,
                      canEditServices,
                    )

                    return (
                      <Link
                        key={setlist.id}
                        href={priority.href}
                        className="group flex min-w-0 flex-col gap-3 px-5 py-4 transition hover:bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 break-words text-sm font-semibold [overflow-wrap:anywhere]">
                              {setlist.name}
                            </span>
                            <span
                              className={
                                "wf-status " +
                                (priority.complete
                                  ? "wf-status-success"
                                  : setlist.readiness.status === "incomplete"
                                    ? "wf-status-danger"
                                    : "wf-status-warning")
                              }
                            >
                              {priority.complete
                                ? "Ready"
                                : "Action needed"}
                            </span>
                          </span>
                          <span className="mt-1 block text-xs text-[var(--muted)]">
                            {formatServiceDate(setlist.service_date)}
                            {formatServiceTime(setlist.service_time)
                              ? ` · ${formatServiceTime(setlist.service_time)}`
                              : ""}
                          </span>
                          <span className="mt-2 block break-words text-xs font-semibold text-[var(--foreground)]">
                            {priority.title}
                          </span>
                          <span className="mt-0.5 block break-words text-xs leading-5 text-[var(--muted)]">
                            {priority.description}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                          {priority.actionLabel}
                          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
              <div className="border-t border-[var(--border)] px-5 py-3 sm:px-6">
                <Link
                  href="/services"
                  className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  Review all services
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </section>
          ) : null}

          {isTeamLeader ? (
            <section
              aria-labelledby="dashboard-upcoming-services-title"
              className="mt-6"
            >
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="dashboard-upcoming-services-title"
                    className="text-base font-semibold"
                  >
                    Upcoming services
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Your next dated worship plans and assigned team members.
                  </p>
                </div>
                <Link
                  href="/services"
                  className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  View schedule
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {workspace.upcomingSetlists.length === 0 ? (
                <div className="wf-card px-5 py-6">
                  <p className="text-sm font-semibold">
                    No upcoming services scheduled
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Create a dated setlist to add a service to your schedule.
                  </p>
                  {canEditServices ? (
                    <Link
                      href="/setlists/new"
                      className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      <Plus className="size-3.5" />
                      Plan a service
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {workspace.upcomingSetlists.map((setlist) => {
                    const priority = getDashboardSetlistPriority(
                      setlist,
                      canEditServices,
                    )
                    const visibleAssignments = setlist.teamAssignments.slice(0, 4)
                    const hiddenAssignmentCount =
                      setlist.teamAssignments.length - visibleAssignments.length

                    return (
                      <Link
                        key={setlist.id}
                        href={priority.href}
                        className="wf-card group flex min-w-0 flex-col p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]/35 hover:shadow-md"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="wf-icon-tile flex size-10 shrink-0 items-center justify-center">
                            <CalendarDays className="size-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block line-clamp-2 break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]">
                              {setlist.name}
                            </span>
                            <span className="mt-1 block text-xs text-[var(--muted)]">
                              {formatServiceDate(setlist.service_date)}
                              {formatServiceTime(setlist.service_time)
                                ? ` · ${formatServiceTime(setlist.service_time)}`
                                : ""}
                            </span>
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              "wf-status " +
                              (priority.complete
                                ? "wf-status-success"
                                : setlist.readiness.status === "incomplete"
                                  ? "wf-status-danger"
                                  : "wf-status-warning")
                            }
                          >
                            {priority.complete
                              ? "Ready"
                              : "Needs attention"}
                          </span>
                          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]">
                            {setlist.readiness.songCount} songs
                          </span>
                          <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)]">
                            {setlist.readiness.totalAssignments} assigned
                          </span>
                        </div>

                        <p className="mt-3 break-words text-xs font-semibold text-[var(--foreground)]">
                          {priority.title}
                        </p>
                        <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-[var(--muted)]">
                          {priority.description}
                        </p>

                        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-1.5 pt-4">
                          {visibleAssignments.length > 0 ? (
                            visibleAssignments.map((assignment) => (
                              <span
                                key={`${assignment.userId}-${assignment.position}`}
                                title={
                                  assignment.displayName +
                                  " · " +
                                  getTeamPositionLabel(assignment.position) +
                                  " · " +
                                  assignment.confirmationStatus
                                }
                                aria-label={
                                  assignment.displayName +
                                  ", " +
                                  getTeamPositionLabel(assignment.position) +
                                  ", " +
                                  assignment.confirmationStatus
                                }
                                className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-[var(--surface)] py-1 pl-1 pr-2 text-[10px] text-[var(--foreground)]"
                              >
                                <span
                                  aria-hidden="true"
                                  className={
                                    "size-1.5 shrink-0 rounded-full " +
                                    (assignment.confirmationStatus === "confirmed"
                                      ? "bg-[var(--success)]"
                                      : assignment.confirmationStatus === "declined"
                                        ? "bg-[var(--danger)]"
                                        : "bg-[var(--warning)]")
                                  }
                                />
                                <ProfileAvatar
                                  name={assignment.displayName}
                                  imageUrl={assignment.avatarUrl}
                                  sizeClassName="size-4"
                                  className="text-[7px]"
                                />
                                <span className="min-w-0 max-w-[100px] truncate">
                                  {assignment.displayName}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="max-w-[90px] truncate">
                                  {getTeamPositionLabel(assignment.position)}
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-[var(--muted)]">
                              No team members assigned
                            </span>
                          )}
                          {hiddenAssignmentCount > 0 ? (
                            <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
                              +{hiddenAssignmentCount} more
                            </span>
                          ) : null}
                        </div>

                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">
                          {priority.actionLabel}
                          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section
            id="your-upcoming-assignments"
            data-tour="member-assignments"
            aria-labelledby="dashboard-my-assignments-title"
            className="mt-6 wf-card overflow-hidden"
          >
            <div className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2
                  id="dashboard-my-assignments-title"
                  className="text-base font-semibold"
                >
                  Your upcoming assignments
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {isTeamLeader
                    ? "Your own commitments alongside the services you coordinate."
                    : "Review your service details and respond to any pending confirmations."}
                </p>
              </div>
              <Link
                href="/my-schedule"
                className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
              >
                My Schedule
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {workspace.myUpcomingAssignments.length === 0 ? (
              <div className="px-5 py-6 sm:px-6">
                <p className="text-sm font-medium">
                  You do not have any upcoming service assignments.
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Your assignments will appear here when a leader schedules you to serve.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4 sm:p-5">
                {workspace.myUpcomingAssignments.map((assignment) => (
                  <article
                    key={assignment.id}
                    className="min-w-0 rounded-2xl border border-[var(--border)] p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/setlists/${assignment.id}`}
                          className="inline-block max-w-full break-words text-sm font-semibold text-[var(--foreground)] hover:text-[var(--brand)] [overflow-wrap:anywhere]"
                        >
                          {assignment.name}
                        </Link>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatServiceDate(assignment.service_date)}
                          {formatServiceTime(assignment.service_time)
                            ? ` · ${formatServiceTime(assignment.service_time)}`
                            : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {assignment.positions.map((position) => (
                            <span
                              key={position}
                              className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-medium text-[var(--brand)]"
                            >
                              {getTeamPositionLabel(position)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {assignment.confirmations.length > 0 ? (
                        <div className="grid min-w-0 gap-3 md:grid-cols-2">
                          {assignment.confirmations.map((confirmation) => (
                            <div
                              key={confirmation.id}
                              className="min-w-0 rounded-xl bg-[var(--surface)] p-3"
                            >
                              <p className="mb-2 break-words text-xs font-semibold text-[var(--foreground)]">
                                {getTeamPositionLabel(confirmation.position)}
                              </p>
                              <AssignmentConfirmation
                                assignmentId={confirmation.id}
                                status={confirmation.status}
                                responseNote={confirmation.responseNote}
                                respondedAt={confirmation.respondedAt}
                                timeZone={workspace.organizationTimezone}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
            <div className="wf-card min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">Recent songs</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Recently created or updated charts
                  </p>
                </div>
                <Link
                  href="/songs"
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline"
                >
                  View all
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>

              {workspace.recentSongs.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="wf-icon-tile mx-auto flex size-12 items-center justify-center">
                    <Music2 className="size-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">
                    Your song library is empty
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[var(--muted)]">
                    Create your first song chart with chords and lyrics.
                  </p>
                  {canEditServices ? (
                    <Link
                      href="/songs/new"
                      className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                    >
                      <Plus className="size-4" />
                      Create song
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {workspace.recentSongs.map((song) => (
                    <Link
                      href={`/songs/${song.id}`}
                      key={song.id}
                      className="flex min-w-0 items-center gap-3 px-5 py-4 transition hover:bg-[var(--surface)] sm:px-6"
                    >
                      <span className="wf-icon-tile flex size-10 shrink-0 items-center justify-center">
                        <Music2 className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]">
                          {song.title}
                        </span>
                        <span className="mt-0.5 block break-words text-xs text-[var(--muted)]">
                          {song.artist || "Unknown artist"}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                        {song.current_key || "—"}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-[var(--muted)]" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <aside className="wf-card min-w-0 overflow-hidden">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="text-base font-semibold">Church workspace</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Your workspace information and service defaults
                </p>
              </div>

              <div className="space-y-5 p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                    Church
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">
                    {workspace.organizationName}
                  </p>
                </div>

                {workspace.organizationDescription ? (
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                      Description
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--muted)] [overflow-wrap:anywhere]">
                      {workspace.organizationDescription}
                    </p>
                  </div>
                ) : null}

                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                    Default service
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold [overflow-wrap:anywhere]">
                    {workspace.defaultServiceName}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatDay(workspace.defaultServiceDay)} at{" "}
                    {formatServiceTime(workspace.defaultServiceTime)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--muted)]">
                    Time zone
                  </p>
                  <p className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
                    {workspace.organizationTimezone}
                  </p>
                </div>

                {workspace.role === "admin" ? (
                  <Link
                    href="/settings"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
                  >
                    <Settings className="size-4" />
                    Manage church settings
                  </Link>
                ) : null}
                <p className="text-xs text-[var(--muted)]">
                  Your workspace role:{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {roleLabel(workspace.role)}
                  </span>
                </p>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </WorshipFlowShell>
  )
}
