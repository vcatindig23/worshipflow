import {
  CalendarClock,
  CalendarDays,
  FolderOpen,
  Guitar,
  LayoutDashboard,
  ListMusic,
  MessagesSquare,
  Music2,
  Settings2,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export type WorkspaceNavigationItem = {
  href: string
  label: string
  icon: LucideIcon
}

/** Frequently used worship-planning destinations shown in both sidebars. */
export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/chord-chart", label: "Chord Chart", icon: Guitar },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/services", label: "Services", icon: CalendarDays },
  { href: "/my-schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/chat", label: "Team Chat", icon: MessagesSquare },
  { href: "/files", label: "Files", icon: FolderOpen },
]

/** Organization and account administration stays separate from daily work. */
export const workspaceManagementNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/settings/team", label: "Team", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

export const workspaceSettingsNavigationItem =
  workspaceManagementNavigationItems[1]
