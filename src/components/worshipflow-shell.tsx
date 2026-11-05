"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Plus } from "lucide-react"
import AccountOptionsMenu from "@/components/account-options-menu"
import DashboardDesktopNavigation from "@/components/dashboard-desktop-navigation"
import DashboardMobileNavigation from "@/components/dashboard-mobile-navigation"
import ProfileAvatar from "@/components/profile-avatar"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"
import ThemeToggleButton from "@/components/theme-toggle-button"
import WorkspaceHeaderActions from "@/components/workspace-header-actions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { isActiveNavigationPath } from "@/lib/navigation"
import { editorRoles } from "@/lib/permissions"
import {
} from "@/lib/workspace-sidebar-preference"
import { workspaceNavigationItems } from "@/lib/workspace-navigation"
import { isImmersiveWorkspaceRoute } from "@/lib/workspace-layout"

type WorkspaceShellData = {
  userName: string
  userAvatarUrl: string | null
  role: string
  organizationName: string
  unreadChatNotificationCount: number
}

type WorshipFlowShellProps = {
  children: React.ReactNode
  workspace: WorkspaceShellData
}

function getWorkspacePageTitle(pathname: string) {
  const currentPath = pathname.replace(/\/+$/, "") || "/"

  if (currentPath === "/") return "Dashboard"
  if (currentPath === "/songs/new") return "New song"
  if (currentPath.startsWith("/songs/")) {
    if (currentPath.endsWith("/edit")) return "Edit song"
    if (currentPath.endsWith("/print")) return "Print song"
    if (currentPath.endsWith("/versions")) return "Song versions"
    return "Song chart"
  }
  if (currentPath === "/setlists/new") return "Create setlist"
  if (currentPath.startsWith("/setlists/")) {
    if (currentPath.includes("/live")) return "Live Stage"
    if (currentPath.endsWith("/edit")) return "Edit service"
    if (currentPath.includes("/preparation")) return "Service preparation"
    return "Service plan"
  }
  if (currentPath.startsWith("/services/templates")) return "Service templates"
  if (currentPath.startsWith("/services/history")) return "Service history"
  if (currentPath.startsWith("/services/insights")) return "Service insights"
  if (currentPath.startsWith("/settings/team")) return "Team"
  if (currentPath.startsWith("/settings/church")) return "Church settings"
  if (currentPath.startsWith("/settings/profile")) return "Profile settings"
  if (currentPath.startsWith("/settings")) return "Settings"
  if (currentPath.startsWith("/profile/")) return "Member profile"
  if (currentPath.startsWith("/profile")) return "Profile"
  if (currentPath.startsWith("/chat")) return "Team chat"
  if (currentPath.startsWith("/activity")) return "Activity"
  if (currentPath.startsWith("/notifications")) return "Notifications"
  if (currentPath.startsWith("/search")) return "Search"

  return (
    workspaceNavigationItems.find((item) =>
      isActiveNavigationPath(currentPath, item.href)
    )?.label ?? "Workspace"
  )
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function WorkspaceSidebarFooter({ workspace }: { workspace: WorkspaceShellData }) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarFooter>
      <ThemeToggleButton
        className={
          collapsed
            ? "mb-2 justify-center px-0 [&>span:last-child]:sr-only"
            : "mb-2"
        }
      />
      <div className={`rounded-xl bg-white/5 ${collapsed ? "p-1" : "p-3"}`}>
        <div
          className={
            collapsed
              ? "flex flex-col items-center gap-1"
              : "flex items-center gap-2"
          }
        >
          <Link
            href="/profile"
            aria-label={`View profile for ${workspace.userName}`}
            title="View profile"
            className={`group flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
              collapsed ? "w-full justify-center" : "min-w-0 flex-1"
            }`}
          >
            <ProfileAvatar
              name={workspace.userName}
              imageUrl={workspace.userAvatarUrl}
              sizeClassName="size-9"
              className="text-xs"
            />
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {workspace.userName}
                </span>
                <span className="block truncate text-xs text-[var(--sidebar-muted)]">
                  {roleLabel(workspace.role)}
                </span>
              </span>
            ) : null}
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="group inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <LogOut aria-hidden="true" className="wf-icon-motion size-4" />
            </button>
          </form>
        </div>
      </div>
    </SidebarFooter>
  )
}

function WorkspaceSidebarBrand() {
  const { state } = useSidebar()

  return (
    <SidebarHeader>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--sidebar)]">
          <WorshipFlowLogo className="size-7" />
        </div>
        {state === "expanded" ? (
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.02em]">
              WorshipFlow
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">
              Worship workspace
            </p>
          </div>
        ) : null}
      </div>
    </SidebarHeader>
  )
}

function WorshipFlowShellLayout({
  children,
  workspace,
}: WorshipFlowShellProps) {
  const pathname = usePathname() ?? "/"
  const pageTitle = getWorkspacePageTitle(pathname)
  const { open } = useSidebar()

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar
        id="workspace-sidebar"
        collapsible="icon"
        aria-label="Workspace navigation"
        className="lg:flex"
      >
        <WorkspaceSidebarBrand />
        <SidebarContent>
          <DashboardDesktopNavigation />
        </SidebarContent>
        <WorkspaceSidebarFooter workspace={workspace} />
      </Sidebar>

      <SidebarInset
        className="wf-workspace-content min-h-screen min-w-0 transition-[padding] duration-200 motion-reduce:transition-none lg:pl-[76px]"
      >
        <header className="app-header sticky top-0 z-30 flex h-[78px] items-center border-b border-[var(--border)] bg-[var(--background)]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <DashboardMobileNavigation
              userName={workspace.userName}
              role={workspace.role}
              userAvatarUrl={workspace.userAvatarUrl}
            />
            <SidebarTrigger className="group hidden size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 lg:inline-flex" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[var(--muted)]">
                {workspace.organizationName}
              </p>
              <p className="truncate text-sm font-semibold">{pageTitle}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <AccountOptionsMenu canManageTeam={workspace.role === "admin"} />
            </div>
            <WorkspaceHeaderActions
              unreadChatCount={workspace.unreadChatNotificationCount}
            />
            {editorRoles.includes(workspace.role) ? (
              <Link
                href="/songs/new"
                className="group ml-1 hidden items-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] sm:inline-flex"
              >
                <Plus aria-hidden="true" className="wf-icon-motion size-4" />
                <span className="hidden md:inline">New Song</span>
                <span className="md:hidden">New</span>
              </Link>
            ) : null}
          </div>
        </header>

        <div className="min-h-[calc(100vh-78px)] min-w-0">{children}</div>
      </SidebarInset>
    </div>
  )
}

export default function WorshipFlowShell({
  children,
  workspace,
}: WorshipFlowShellProps) {
  const pathname = usePathname() ?? "/"

  if (isImmersiveWorkspaceRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={false} className="min-h-screen">
      <WorshipFlowShellLayout workspace={workspace}>
        {children}
      </WorshipFlowShellLayout>
    </SidebarProvider>
  )
}
