export type DashboardSetlistPriorityInput = {
  id: string
  name: string
  service_date: string | null
  service_time: string | null
  readiness: {
    songCount: number
    totalAssignments: number
    pendingAssignments: number
    declinedAssignments: number
  }
}

export type DashboardSetlistPriority = {
  title: string
  description: string
  actionLabel: string
  href: string
  complete: boolean
}

export function getDashboardSetlistPriority(
  setlist: DashboardSetlistPriorityInput,
  canEdit: boolean,
): DashboardSetlistPriority {
  const serviceHref = `/setlists/${setlist.id}`

  if (!setlist.service_date || !setlist.service_time) {
    return {
      title: "Complete the service schedule",
      description: "Add the service date and start time so your team knows when to gather.",
      actionLabel: canEdit ? "Set schedule" : "View service",
      href: canEdit ? `${serviceHref}/edit` : serviceHref,
      complete: false,
    }
  }

  if (setlist.readiness.songCount === 0) {
    return {
      title: "Add songs to the worship order",
      description: "This service does not have any songs yet.",
      actionLabel: "Add songs",
      href: `${serviceHref}#worship-order`,
      complete: false,
    }
  }

  if (setlist.readiness.totalAssignments === 0) {
    return {
      title: "Assign the worship team",
      description: "Choose the musicians and vocalists who will serve at this service.",
      actionLabel: "Assign team",
      href: `${serviceHref}#worship-team`,
      complete: false,
    }
  }

  if (setlist.readiness.declinedAssignments > 0) {
    const count = setlist.readiness.declinedAssignments
    return {
      title: "Resolve declined responses",
      description: `${count} ${count === 1 ? "assignment was" : "assignments were"} declined and need follow-up.`,
      actionLabel: "Review responses",
      href: `${serviceHref}#worship-team`,
      complete: false,
    }
  }

  if (setlist.readiness.pendingAssignments > 0) {
    const count = setlist.readiness.pendingAssignments
    return {
      title: "Follow up on team confirmations",
      description: `${count} ${count === 1 ? "person is" : "people are"} still waiting to confirm.`,
      actionLabel: "Review confirmations",
      href: `${serviceHref}#worship-team`,
      complete: false,
    }
  }

  return {
    title: "Service preparation is on track",
    description: "The schedule, song order, team assignments, and confirmations are in place.",
    actionLabel: "Review service",
    href: serviceHref,
    complete: true,
  }
}
