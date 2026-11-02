import {
  Activity,
  Bell,
  CalendarClock,
  CalendarDays,
  ContactRound,
  FolderOpen,
  Guitar,
  LayoutDashboard,
  ListMusic,
  MessagesSquare,
  Music2,
  Search,
  Settings2,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

export type WorkspaceNavigationItem = {
  href: string
  label: string
  icon: LucideIcon
}

/** The destinations used most often while planning and running a service. */
export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/chord-chart", label: "Chord Chart", icon: Guitar },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/services", label: "Services", icon: CalendarDays },
  { href: "/my-schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/settings/team", label: "Team", icon: UsersRound },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/chat", label: "Team chat", icon: MessagesSquare },
]

/** Helpful destinations kept separate from the primary worship workflow. */
export const workspaceUtilityNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Activity", icon: Activity },
]

/** Personal and administrative destinations are grouped away from workspace work. */
export const workspaceAccountNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/profile", label: "Profile", icon: ContactRound },
  { href: "/settings", label: "Settings", icon: Settings2 },
]

export const workspaceSettingsNavigationItem =
  workspaceAccountNavigationItems[1]
