"use client"

import Link from "next/link"
import { Settings2 } from "lucide-react"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { isActiveNavigationPath } from "@/lib/navigation"

type DashboardNavigationItem = {
  label: string
  href: string
  icon: ReactNode
}

type DashboardDesktopNavigationProps = {
  items: DashboardNavigationItem[]
}

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/"
}

export default function DashboardDesktopNavigation({
  items,
}: DashboardDesktopNavigationProps) {
  const pathname = normalizePathname(usePathname() ?? "/")
  const teamIsActive = isActiveNavigationPath(pathname, "/settings/team")
  const settingsIsActive =
    isActiveNavigationPath(pathname, "/settings") && !teamIsActive

  return (
    <div className="flex-1 overflow-y-auto px-3 py-5">
      <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
        Workspace
      </div>

      <nav
        aria-label="Workspace navigation"
        data-tour="sidebar-navigation"
        className="space-y-1"
      >
        {items.map((item) => {
          const active = isActiveNavigationPath(pathname, item.href)
          const exact = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? (exact ? "page" : "location") : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                active
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--sidebar-muted)] hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b5d4bd]"
                />
              ) : null}
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition duration-200 ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--sidebar-muted)] group-hover:bg-white/10 group-hover:text-white"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
        Manage
      </div>

      <nav aria-label="Workspace management" className="space-y-1">
        <Link
          href="/settings"
          aria-current={
            settingsIsActive
              ? pathname === "/settings"
                ? "page"
                : "location"
              : undefined
          }
          className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
            settingsIsActive
              ? "bg-[var(--brand)] text-white shadow-sm"
              : "text-[var(--sidebar-muted)] hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          {settingsIsActive ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b5d4bd]"
            />
          ) : null}
          <span
            className={`flex size-8 items-center justify-center rounded-lg transition ${
              settingsIsActive
                ? "bg-white/10 text-white"
                : "text-[var(--sidebar-muted)] group-hover:bg-white/10 group-hover:text-white"
            }`}
          >
            <Settings2
              aria-hidden="true"
              className="wf-icon-motion size-[18px]"
              strokeWidth={1.9}
            />
          </span>
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  )
}
