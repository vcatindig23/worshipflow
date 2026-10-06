"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  BookOpen,
  CalendarDays,
  Church,
  LayoutDashboard,
  Menu,
  Music2,
  Settings,
  Users,
  X,
} from "lucide-react"

type WorshipFlowShellProps = {
  children: React.ReactNode
}

const navigation = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/songs",
    label: "Songs",
    icon: Music2,
  },
  {
    href: "/setlists",
    label: "Setlists",
    icon: BookOpen,
  },
  {
    href: "/services",
    label: "Services",
    icon: CalendarDays,
  },
  {
    href: "/settings/team",
    label: "Team",
    icon: Users,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
]

function isActivePath(
  pathname: string,
  href: string
) {
  if (href === "/") {
    return pathname === "/"
  }

  if (href === "/settings") {
    return (
      pathname === "/settings" ||
      pathname.startsWith("/settings/church")
    )
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  )
}

export default function WorshipFlowShell({
  children,
}: WorshipFlowShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] =
    useState(false)

  const navigationContent = (
    <>
      <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
        Workspace
      </p>

      {navigation.map((item) => {
        const active = isActivePath(
          pathname,
          item.href
        )

        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() =>
              setMobileOpen(false)
            }
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/10 text-white"
                : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="size-4.5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[var(--sidebar)] lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
              <Music2 className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="font-bold tracking-tight text-white">
                WorshipFlow
              </p>

              <p className="text-xs text-[var(--sidebar-muted)]">
                Worship workspace
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            {navigationContent}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                  <Church className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Church Workspace
                  </p>

                  <p className="text-xs text-[var(--sidebar-muted)]">
                    WorshipFlow
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() =>
              setMobileOpen(false)
            }
            className="absolute inset-0 bg-black/40"
          />

          <aside className="absolute inset-y-0 left-0 w-72 bg-[var(--sidebar)] shadow-2xl">
            <div className="flex h-full flex-col">
              <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
                    <Music2 className="size-5" />
                  </div>

                  <div>
                    <p className="font-bold text-white">
                      WorshipFlow
                    </p>

                    <p className="text-xs text-[var(--sidebar-muted)]">
                      Worship workspace
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  className="flex size-9 items-center justify-center rounded-lg text-[var(--sidebar-muted)] transition hover:bg-white/5 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                {navigationContent}
              </nav>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="app-header sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/95 px-5 backdrop-blur md:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() =>
              setMobileOpen(true)
            }
            className="flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] lg:hidden"
          >
            <Menu className="size-5" />
          </button>

          <div className="hidden text-sm font-medium text-[var(--muted)] sm:block">
            WorshipFlow
          </div>

          <div className="flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-white text-sm font-semibold text-[var(--brand)]">
            W
          </div>
        </header>

        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  )
}