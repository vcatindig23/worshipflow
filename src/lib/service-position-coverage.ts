export const serviceCoveragePositionLabels: Record<string, string> = {
  worship_leader: "Worship Leader",
  singer: "Singers",
  guitarist: "Guitarists",
  bassist: "Bassist",
  keyboardist: "Keyboardist",
  pianist: "Pianist",
  drummer: "Drummer",
  percussionist: "Percussionist",
  violinist: "Violinist",
  cellist: "Cellist",
  sound_engineer: "Sound Engineer",
  audio_visual: "Audio / Visual",
  choir_member: "Choir Members",
  other: "Other",
}

export type ServicePositionRequirement = {
  team_position: string
  required_count: number
}

export type ServicePositionAssignment = {
  user_id?: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
}

export type ServicePositionCoverageRow = {
  teamPosition: string
  label: string
  required: number
  assigned: number
  confirmed: number
  pending: number
  declined: number
  vacant: number
  filled: number
}

export type ServicePositionCoverage = {
  hasRequirements: true
  requiredSlots: number
  assignedSlots: number
  filledSlots: number
  confirmedSlots: number
  pendingAssignments: number
  declinedAssignments: number
  vacantSlots: number
  percentage: number
  isComplete: boolean
  rows: ServicePositionCoverageRow[]
}

const guitaristPositions = new Set([
  "lead_guitarist",
  "rhythm_guitarist",
  "acoustic_guitarist",
  "electric_guitarist",
])

function getPositionAssignments(
  teamPosition: string,
  assignments: ServicePositionAssignment[]
) {
  if (teamPosition !== "guitarist") {
    return assignments.filter(
      (assignment) => assignment.team_position === teamPosition
    )
  }

  // A member assigned to more than one guitar part still represents one guitarist
  // for the aggregate coverage requirement.
  const guitarAssignments = assignments.filter((assignment) =>
    guitaristPositions.has(assignment.team_position)
  )
  const byMember = new Map<string, ServicePositionAssignment[]>()

  guitarAssignments.forEach((assignment, index) => {
    const key = assignment.user_id ?? `assignment-${index}`
    byMember.set(key, [...(byMember.get(key) ?? []), assignment])
  })

  return Array.from(byMember.values()).map((memberAssignments) => {
    const confirmationStatus = memberAssignments.some(
      (assignment) => assignment.confirmation_status === "confirmed"
    )
      ? "confirmed"
      : memberAssignments.some(
            (assignment) => assignment.confirmation_status === "pending"
          )
        ? "pending"
        : "declined"

    return {
      ...memberAssignments[0],
      confirmation_status: confirmationStatus,
    }
  })
}

export function getServicePositionCoverage(
  requirements: ServicePositionRequirement[],
  assignments: ServicePositionAssignment[]
): ServicePositionCoverage | null {
  const configured = requirements
    .filter((requirement) => requirement.required_count > 0)
    .slice()
    .sort((a, b) => {
      const aIndex = Object.keys(serviceCoveragePositionLabels).indexOf(a.team_position)
      const bIndex = Object.keys(serviceCoveragePositionLabels).indexOf(b.team_position)
      return aIndex - bIndex || a.team_position.localeCompare(b.team_position)
    })

  if (configured.length === 0) return null

  const rows = configured.map((requirement) => {
    const matchingAssignments = getPositionAssignments(
      requirement.team_position,
      assignments
    )
    const confirmed = matchingAssignments.filter(
      (assignment) => assignment.confirmation_status === "confirmed"
    ).length
    const pending = matchingAssignments.filter(
      (assignment) => assignment.confirmation_status === "pending"
    ).length
    const declined = matchingAssignments.filter(
      (assignment) => assignment.confirmation_status === "declined"
    ).length
    const assigned = confirmed + pending

    return {
      teamPosition: requirement.team_position,
      label:
        serviceCoveragePositionLabels[requirement.team_position] ??
        requirement.team_position,
      required: requirement.required_count,
      assigned,
      confirmed,
      pending,
      declined,
      vacant: Math.max(0, requirement.required_count - assigned),
      filled: Math.min(requirement.required_count, assigned),
    }
  })

  const requiredSlots = rows.reduce((total, row) => total + row.required, 0)
  const assignedSlots = rows.reduce((total, row) => total + row.assigned, 0)
  const filledSlots = rows.reduce((total, row) => total + row.filled, 0)
  const confirmedSlots = rows.reduce(
    (total, row) => total + Math.min(row.required, row.confirmed),
    0
  )
  const pendingAssignments = rows.reduce((total, row) => total + row.pending, 0)
  const declinedAssignments = rows.reduce((total, row) => total + row.declined, 0)
  const vacantSlots = rows.reduce((total, row) => total + row.vacant, 0)

  return {
    hasRequirements: true,
    requiredSlots,
    assignedSlots,
    filledSlots,
    confirmedSlots,
    pendingAssignments,
    declinedAssignments,
    vacantSlots,
    percentage: requiredSlots > 0
      ? Math.round((filledSlots / requiredSlots) * 100)
      : 100,
    isComplete: vacantSlots === 0,
    rows,
  }
}
