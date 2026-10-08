import { getTeamPositionLabel } from "./team-positions"

export type ActivityEntry = {
  action: string
  actor_name: string
  entity_name: string
  details: Record<string, unknown>
}

function detailText(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0
    ? value
    : fallback
}

function roleText(value: unknown) {
  return detailText(value, "team_member")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export function describeActivity(entry: ActivityEntry) {
  const memberName = detailText(entry.details.member_name, "a team member")
  const position = getTeamPositionLabel(
    detailText(entry.details.position, "other")
  )
  const songName = detailText(entry.details.song_name, "a song")

  switch (entry.action) {
    case "song.created":
      return `Added “${entry.entity_name}” to the song library.`
    case "song.updated":
      return `Updated “${entry.entity_name}”.`
    case "song.archived":
      return `Archived “${entry.entity_name}”.`
    case "song.restored":
      return `Restored “${entry.entity_name}” to the song library.`
    case "song.deleted":
      return `Deleted “${entry.entity_name}”.`
    case "service.created":
      return `Created the service “${entry.entity_name}”.`
    case "service.updated":
      return `Updated the service “${entry.entity_name}”.`
    case "service.published":
      return `Published the service “${entry.entity_name}”.`
    case "service.archived":
      return `Archived the service “${entry.entity_name}”.`
    case "service.restored":
      return `Restored the service “${entry.entity_name}”.`
    case "service.deleted":
      return `Deleted the service “${entry.entity_name}”.`
    case "service.song_added":
      return `Added “${songName}” to the service “${entry.entity_name}”.`
    case "service.song_removed":
      return `Removed “${songName}” from the service “${entry.entity_name}”.`
    case "team.assigned":
      return `Assigned ${memberName} as ${position} for “${entry.entity_name}”.`
    case "team.unassigned":
      return `Removed ${memberName} as ${position} from “${entry.entity_name}”.`
    case "member.joined":
      return `${memberName} joined the team as ${roleText(entry.details.role)}.`
    case "member.role_changed":
      return `Changed ${memberName}’s role to ${roleText(entry.details.role)}.`
    case "member.positions_changed": {
      const positions = Array.isArray(entry.details.team_positions)
        ? entry.details.team_positions
            .filter((item): item is string => typeof item === "string")
            .map(getTeamPositionLabel)
        : []
      return positions.length > 0
        ? `Updated ${memberName}’s team positions to ${positions.join(", ")}.`
        : `Updated ${memberName}’s team positions.`
    }
    case "member.removed":
      return `Removed ${memberName} from the team.`
    default:
      return `Updated “${entry.entity_name}”.`
  }
}
