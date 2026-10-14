"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  CalendarClock,
  CalendarDays,
  ContactRound,
  FileText,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  MessagesSquare,
  Music2,
  Settings2,
  UsersRound,
  X,
} from "lucide-react"
import ProfileAvatar from "@/components/profile-avatar"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"

type DashboardMobileNavigationProps = {
  userName: string
  role: string
  userAvatarUrl: string | null
}

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/songs", label: "Songs", icon: Music2 },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/services", label: "Services", icon: CalendarDays },
  { href: "/my-schedule", label: "My Schedule", icon: CalendarClock },
  { href: "/profile", label: "Profile", icon: ContactRound },
  { href: "/settings/team", label: "Team", icon: UsersRound },
  { href: "/chat", label: "Team Chat", icon: MessagesSquare },
  { href: "/files", label: "Files", icon: FileText },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export default function DashboardMobileNavigation({
  userName,
  role,
  userAvatarUrl,
}: DashboardMobileNavigationProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 lg:hidden"
      >
        <Menu className="wf-icon-motion size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="relative flex h-full w-[min(86vw,340px)] flex-col border-r border-white/10 bg-[var(--sidebar)] text-white shadow-2xl animate-in slide-in-from-left duration-200"
          >
            <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-white/10 px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--sidebar)]">
                  <WorshipFlowLogo className="size-7" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight">
                    WorshipFlow
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">
                    Worship workspace
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="group inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X className="wf-icon-motion size-5" />
              </button>
            </div>

            <nav aria-label="Workspace" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
              <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
                Workspace
              </p>
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-[var(--sidebar-muted)] hover:bg-white/[0.07] hover:text-white"
                    }`}
                  >
                    {active ? (
                      <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#b5d4bd]" />
                    ) : null}
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition duration-200 ${
                      active
                        ? "bg-[var(--brand)] text-white"
                        : "text-[var(--sidebar-muted)] group-hover:bg-white/10 group-hover:text-white"
                    }`}>
                      <Icon className="wf-icon-motion size-[18px]" strokeWidth={1.9} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}

              <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
                Manage
              </p>
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                aria-current={pathname === "/settings" || pathname.startsWith("/settings/church") ? "page" : undefined}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sidebar-muted)] transition duration-200 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <span className="flex size-8 items-center justify-center rounded-lg transition group-hover:bg-white/10">
                  <Settings2 className="wf-icon-motion size-[18px]" strokeWidth={1.9} />
                </span>
                Settings
              </Link>
            </nav>

            <div className="shrink-0 border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label={`View profile for ${userName}`}
                >
                  <ProfileAvatar
                    name={userName}
                    imageUrl={userAvatarUrl}
                    sizeClassName="size-10"
                    className="text-xs"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">
                      {userName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--sidebar-muted)]">
                      {formatRole(role)}
                    </span>
                  </span>
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    aria-label="Sign out"
                    title="Sign out"
                    className="group inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <LogOut className="wf-icon-motion size-4" />
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
