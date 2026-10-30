"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, PanelLeft, PanelLeftClose, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import AccountOptionsMenu from "@/components/account-options-menu"
import DashboardDesktopNavigation from "@/components/dashboard-desktop-navigation"
import DashboardMobileNavigation from "@/components/dashboard-mobile-navigation"
import ProfileAvatar from "@/components/profile-avatar"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"
import ThemeToggleButton from "@/components/theme-toggle-button"
import WorkspaceHeaderActions from "@/components/workspace-header-actions"
import { isActiveNavigationPath } from "@/lib/navigation"
import { workspaceNavigationItems } from "@/lib/workspace-navigation"
import { isImmersiveWorkspaceRoute } from "@/lib/workspace-layout"
import {
  isWorkspaceSidebarHiddenPreference,
  WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY,
} from "@/lib/workspace-sidebar-preference"

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
  if (
    currentPath === "/settings/team" ||
    currentPath.startsWith("/settings/team/")
  ) {
    return "Team"
  }
  if (currentPath.startsWith("/settings")) return "Settings"
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

export default function WorshipFlowShell({
  children,
  workspace,
}: WorshipFlowShellProps) {
  const pathname = usePathname() ?? "/"
  const pageTitle = getWorkspacePageTitle(pathname)
  const [sidebarHidden, setSidebarHidden] = useState(false)

  useEffect(() => {
    try {
      // Hydrate the saved preference after mount to keep server markup deterministic.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarHidden(
        isWorkspaceSidebarHiddenPreference(
          window.localStorage.getItem(WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY)
        )
      )
    } catch {
      // The sidebar stays visible when browser storage is unavailable.
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY) return
      setSidebarHidden(isWorkspaceSidebarHiddenPreference(event.newValue))
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  function toggleSidebarVisibility() {
    const nextHidden = !sidebarHidden
    setSidebarHidden(nextHidden)

    try {
      window.localStorage.setItem(
        WORKSPACE_SIDEBAR_HIDDEN_STORAGE_KEY,
        String(nextHidden)
      )
    } catch {
      // Keep the selected visibility for the current page when storage is unavailable.
    }
  }

  if (isImmersiveWorkspaceRoute(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside
        id="workspace-sidebar"
        aria-hidden={sidebarHidden}
        className={`app-sidebar fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/10 bg-[var(--sidebar)] text-white ${
          sidebarHidden ? "lg:hidden" : "lg:flex"
        }`}
      >
        <div className="flex h-[78px] shrink-0 items-center gap-3 border-b border-white/8 px-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--sidebar)]">
            <WorshipFlowLogo className="size-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.02em]">
              WorshipFlow
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">
              Worship workspace
            </p>
          </div>
        </div>

        <DashboardDesktopNavigation />

        <div className="shrink-0 border-t border-white/8 p-3">
          <ThemeToggleButton className="mb-2" />
          <div className="rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                aria-label={`View profile for ${workspace.userName}`}
                title="View profile"
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <ProfileAvatar
                  name={workspace.userName}
                  imageUrl={workspace.userAvatarUrl}
                  sizeClassName="size-9"
                  className="text-xs"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium transition group-hover:text-white">
                    {workspace.userName}
                  </span>
                  <span className="block truncate text-xs text-[var(--sidebar-muted)]">
                    {roleLabel(workspace.role)}
                  </span>
                </span>
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="group rounded-lg p-1.5 text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <LogOut aria-hidden="true" className="wf-icon-motion size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`wf-workspace-content min-h-screen min-w-0 transition-[padding] duration-200 motion-reduce:transition-none ${
          sidebarHidden ? "lg:pl-0" : "lg:pl-[264px]"
        }`}
      >
        <header className="app-header sticky top-0 z-30 flex h-[78px] items-center border-b border-[var(--border)] bg-[var(--background)]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <DashboardMobileNavigation
              userName={workspace.userName}
              role={workspace.role}
              userAvatarUrl={workspace.userAvatarUrl}
            />
            <button
              type="button"
              onClick={toggleSidebarVisibility}
              aria-label={
                sidebarHidden
                  ? "Show sidebar navigation"
                  : "Hide sidebar navigation"
              }
              aria-controls="workspace-sidebar"
              aria-expanded={!sidebarHidden}
              title={
                sidebarHidden
                  ? "Show sidebar navigation"
                  : "Hide sidebar navigation"
              }
              className="group hidden size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 lg:inline-flex"
            >
              {sidebarHidden ? (
                <PanelLeft aria-hidden="true" className="wf-icon-motion size-[18px]" />
              ) : (
                <PanelLeftClose aria-hidden="true" className="wf-icon-motion size-[18px]" />
              )}
            </button>
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
            <WorkspaceHeaderActions unreadChatCount={workspace.unreadChatNotificationCount} />
            <Link
              href="/songs/new"
              className="group ml-1 hidden items-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] sm:inline-flex"
            >
              <Plus aria-hidden="true" className="wf-icon-motion size-4" />
              <span className="hidden md:inline">New Song</span>
              <span className="md:hidden">New</span>
            </Link>
          </div>
        </header>

        <div className="min-h-[calc(100vh-78px)] min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
