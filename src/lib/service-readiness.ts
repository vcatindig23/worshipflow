import {
  getServicePositionCoverage,
  type ServicePositionCoverage,
  type ServicePositionRequirement,
  type ServicePositionAssignment,
} from "@/lib/service-position-coverage"

export type ReadinessStatus = "ready" | "attention" | "incomplete"

export type ServiceReadiness = {
  status: ReadinessStatus
  percentage: number
  completedChecks: number
  totalChecks: number
  confirmedAssignments: number
  pendingAssignments: number
  declinedAssignments: number
  totalAssignments: number
  hasSchedule: boolean
  hasSongs: boolean
  hasTeam: boolean
  hasUnconfirmedTeam: boolean
  positionCoverage: ServicePositionCoverage | null
}

export type ServiceReadinessAssignment = {
  confirmation_status: "pending" | "confirmed" | "declined"
  team_position?: string
  user_id?: string
}

export type ServiceReadinessSchedule = {
  service_date: string | null
  service_time: string | null
}

export function getServiceReadiness(
  setlist: ServiceReadinessSchedule,
  songCount: number,
  assignments: ServiceReadinessAssignment[],
  requirements: ServicePositionRequirement[] = []
): ServiceReadiness {
  const hasSchedule = Boolean(setlist.service_date) && Boolean(setlist.service_time)
  const hasSongs = songCount > 0
  const hasTeam = assignments.length > 0

  const confirmedAssignments = assignments.filter(
    (assignment) => assignment.confirmation_status === "confirmed"
  ).length
  const pendingAssignments = assignments.filter(
    (assignment) => assignment.confirmation_status === "pending"
  ).length
  const declinedAssignments = assignments.filter(
    (assignment) => assignment.confirmation_status === "declined"
  ).length
  const totalAssignments = assignments.length
  const hasUnconfirmedTeam = pendingAssignments > 0 || declinedAssignments > 0

  const positionCoverage = getServicePositionCoverage(
    requirements,
    assignments.map((assignment) => ({
      ...assignment,
      team_position: assignment.team_position ?? "",
    })) as ServicePositionAssignment[]
  )

  // Keep the original four checks for services without configured position requirements.
  const checks = [
    hasSchedule,
    hasSongs,
    hasTeam,
    hasTeam && totalAssignments > 0 && confirmedAssignments === totalAssignments,
    ...(positionCoverage ? [positionCoverage.isComplete] : []),
  ]
  const completedChecks = checks.filter(Boolean).length
  const totalChecks = checks.length
  const percentage = Math.round((completedChecks / totalChecks) * 100)

  const status: ReadinessStatus =
    percentage === 100 ? "ready" : percentage >= 50 ? "attention" : "incomplete"

  return {
    status,
    percentage,
    completedChecks,
    totalChecks,
    confirmedAssignments,
    pendingAssignments,
    declinedAssignments,
    totalAssignments,
    hasSchedule,
    hasSongs,
    hasTeam,
    hasUnconfirmedTeam,
    positionCoverage,
  }
}

export function getReadinessLabel(readiness: ServiceReadiness) {
  if (readiness.status === "ready") return "Ready"
  if (readiness.status === "attention") return "Needs attention"
  return "Incomplete"
}
