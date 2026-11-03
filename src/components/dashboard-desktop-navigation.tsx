"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { isActiveNavigationPath } from "@/lib/navigation"
import {
  workspaceManagementNavigationItems,
  workspaceNavigationItems,
  type WorkspaceNavigationItem,
} from "@/lib/workspace-navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/"
}

function NavigationLink({
  item,
  pathname,
}: {
  item: WorkspaceNavigationItem
  pathname: string
}) {
  const active = isActiveNavigationPath(pathname, item.href)
  const exact = pathname === item.href
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={item.href} />}
        isActive={active}
        ariaCurrent={exact ? "page" : "location"}
        tooltip={item.label}
      >
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition duration-200 ${
            active
              ? "bg-white/10 text-white"
              : "text-[var(--sidebar-muted)] group-hover:bg-white/10 group-hover:text-white"
          }`}
        >
          <Icon
            aria-hidden="true"
            className="wf-icon-motion size-[18px]"
            strokeWidth={1.9}
          />
        </span>
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export default function DashboardDesktopNavigation() {
  const pathname = normalizePathname(usePathname() ?? "/")

  return (
    <div className="space-y-7" data-tour="sidebar-navigation">
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarGroupContent>
          <nav aria-label="Workspace navigation">
            <SidebarMenu>
              {workspaceNavigationItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Manage</SidebarGroupLabel>
        <SidebarGroupContent>
          <nav aria-label="Workspace management">
            <SidebarMenu>
              {workspaceManagementNavigationItems.map((item) => (
                <NavigationLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  )
}
