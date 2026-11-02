export type WorkspaceBreadcrumbItem = {
  href: string
  label: string
  current: boolean
}

const labels: Record<string, string> = {
  songs: "Songs",
  setlists: "Setlists",
  services: "Services",
  files: "Files",
  settings: "Settings",
  security: "Account security",
  team: "Team",
  profile: "Profile",
  church: "Church settings",
  "my-schedule": "My schedule",
  notifications: "Notifications",
  activity: "Activity",
  templates: "Templates",
  history: "Service history",
  insights: "Insights",
  new: "Create",
  edit: "Edit",
  complete: "Complete service",
  preparation: "Preparation",
  versions: "Versions",
  search: "Search",
  audit: "Permission history",
}

function isDynamicSegment(segment: string) {
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return true
  return segment.length >= 5 && /\d/.test(segment) && /^[a-z0-9_-]+$/i.test(segment)
}

function dynamicSegmentFallback(parent: string | undefined) {
  switch (parent) {
    case "songs":
      return "Song details"
    case "setlists":
      return "Service details"
    case "templates":
      return "Template details"
    case "profile":
      return "Member profile"
    case "versions":
      return "Saved version"
    default:
      return "Details"
  }
}

function humanizeSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/** Builds readable breadcrumb labels; pass a loaded record title when available. */
export function buildWorkspaceBreadcrumbs(
  pathname: string,
  currentLabel?: string
): WorkspaceBreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return []

  const dynamicIndices = segments.flatMap((segment, index) =>
    isDynamicSegment(segment) ? [index] : []
  )
  const namedRecordIndex = dynamicIndices.at(-1) ?? -1
  const lastIndex = segments.length - 1

  return segments.map((segment, index) => {
    const label =
      currentLabel?.trim() && index === namedRecordIndex
        ? currentLabel.trim()
        : isDynamicSegment(segment)
          ? dynamicSegmentFallback(segments[index - 1])
          : labels[segment] ?? humanizeSegment(segment)

    return {
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label,
      current: index === lastIndex,
    }
  })
}
