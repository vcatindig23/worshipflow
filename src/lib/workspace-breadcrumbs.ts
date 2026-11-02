export type WorkspaceBreadcrumb = {
  label: string
  href: string
  current: boolean
}

const routeLabels: Record<string, string> = {
  songs: "Songs",
  setlists: "Setlists",
  services: "Services",
  files: "Files",
  settings: "Settings",
  security: "Account security",
  team: "Team",
  invitations: "Invitations",
  audit: "Activity log",
  profile: "Profile",
  church: "Church settings",
  "my-schedule": "My schedule",
  notifications: "Notifications",
  activity: "Activity",
  templates: "Service templates",
  history: "Service history",
  insights: "Service insights",
  new: "Create",
  edit: "Edit",
  complete: "Complete service",
  preparation: "Preparation",
  versions: "Versions",
  search: "Search",
  chat: "Team chat",
  "chord-chart": "Chord chart",
}

function getSegmentLabel(segment: string, previousSegment?: string) {
  if (previousSegment === "songs" && segment === "new") return "New song"
  if (previousSegment === "setlists" && segment === "new") return "Create setlist"
  if (previousSegment === "settings" && segment === "profile") return "Profile settings"
  if (routeLabels[segment]) return routeLabels[segment]
  if (previousSegment === "songs") return "Song chart"
  if (previousSegment === "setlists") return "Service plan"
  if (previousSegment === "profile") return "Member profile"
  if (previousSegment === "services") return "Service details"
  return "Details"
}

export function getWorkspaceBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  return segments.map((segment, index): WorkspaceBreadcrumb => ({
    label: getSegmentLabel(segment, segments[index - 1]),
    href: "/" + segments.slice(0, index + 1).join("/"),
    current: index === segments.length - 1,
  }))
}
