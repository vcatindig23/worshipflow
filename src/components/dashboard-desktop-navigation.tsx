"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { isActiveNavigationPath } from "@/lib/navigation"
import {
  workspaceAccountNavigationItems,
  workspaceNavigationItems,
  workspaceUtilityNavigationItems,
  type WorkspaceNavigationItem,
} from "@/lib/workspace-navigation"

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/"
}

function NavigationSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: WorkspaceNavigationItem[]
  pathname: string
}) {
  return (
    <section>
      <h2 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--sidebar-muted)]">
        {label}
      </h2>
      <nav aria-label={label} className="space-y-1">
        {items.map((item) => {
          const active = isActiveNavigationPath(pathname, item.href)
          const exact = pathname === item.href
          const Icon = item.icon

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
                <Icon aria-hidden="true" className="wf-icon-motion size-[18px]" strokeWidth={1.9} />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </section>
  )
}

export default function DashboardDesktopNavigation() {
  const pathname = normalizePathname(usePathname() ?? "/")

  return (
    <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-3 py-5">
      <NavigationSection
        label="Workspace"
        items={workspaceNavigationItems}
        pathname={pathname}
      />
      <NavigationSection
        label="Tools"
        items={workspaceUtilityNavigationItems}
        pathname={pathname}
      />
      <NavigationSection
        label="Account"
        items={workspaceAccountNavigationItems}
        pathname={pathname}
      />
    </div>
  )
}
