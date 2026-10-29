import {
  CalendarClock,
  CalendarDays,
  ContactRound,
  FolderOpen,
  Guitar,
  LayoutDashboard,
  ListMusic,
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

export const workspaceNavigationItems: WorkspaceNavigationItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/chord-chart", label: "Chord Chart", icon: Guitar },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/services", label: "Services", icon: CalendarDays },
  { href: "/my-schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/settings/team", label: "Team", icon: UsersRound },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/profile", label: "Profile", icon: ContactRound },
]

export const workspaceSettingsNavigationItem: WorkspaceNavigationItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings2,
}
