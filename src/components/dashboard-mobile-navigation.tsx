"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CalendarClock,
  CalendarDays,
  ContactRound,
  FileText,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Music2,
  Settings2,
  UsersRound,
  X,
} from "lucide-react"
import ProfileAvatar from "@/components/profile-avatar"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"
import ThemeToggleButton from "@/components/theme-toggle-button"

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
  const [openForPathname, setOpenForPathname] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const open = openForPathname === pathname

  const closeNavigation = useCallback((restoreFocus = true) => {
    setOpenForPathname(null)
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const initialFocusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeNavigation()
        return
      }

      if (event.key !== "Tab") return

      const drawer = drawerRef.current
      if (!drawer) return

      const focusableElements = drawer.querySelectorAll<HTMLElement>(
        'a[href]:not([aria-disabled="true"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstFocusable = focusableElements.item(0)
      const lastFocusable = focusableElements.item(focusableElements.length - 1)

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault()
        drawer.focus()
        return
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstFocusable ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastFocusable ||
          !drawer.contains(document.activeElement))
      ) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      window.cancelAnimationFrame(initialFocusFrame)
      document.body.style.overflow = previousBodyOverflow
    }
  }, [open, closeNavigation])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() =>
          setOpenForPathname((current) =>
            current === pathname ? null : pathname
          )
        }
        aria-label="Open navigation"
        data-tour="mobile-navigation"
        aria-haspopup="dialog"
        aria-controls="mobile-workspace-navigation"
        aria-expanded={open}
        className="group inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition duration-200 hover:border-[var(--brand)]/40 hover:bg-[var(--brand-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25 lg:hidden"
      >
        <Menu aria-hidden="true" className="wf-icon-motion size-5" />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[120] isolate overflow-hidden lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => closeNavigation()}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />

          <aside
            ref={drawerRef}
            id="mobile-workspace-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            tabIndex={-1}
            className="relative flex h-dvh w-[min(86vw,340px)] flex-col border-r border-white/10 bg-[var(--sidebar)] text-white shadow-2xl wf-drawer-enter"
          >
            <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-white/10 px-5 pt-[env(safe-area-inset-top)]">
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
                ref={closeButtonRef}
                type="button"
                aria-label="Close navigation"
                onClick={() => closeNavigation()}
                className="group inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X aria-hidden="true" className="wf-icon-motion size-5" />
              </button>
            </div>

            <nav
              aria-label="Workspace"
              className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-5"
            >
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
                    onClick={() => closeNavigation(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                      active
                        ? "bg-white/10 text-white"
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
                          ? "bg-[var(--brand)] text-white"
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
                  </Link>
                )
              })}

              <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
                Manage
              </p>
              <Link
                href="/settings"
                onClick={() => closeNavigation(false)}
                aria-current={
                  pathname === "/settings" || pathname.startsWith("/settings/")
                    ? "page"
                    : undefined
                }
                className="group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--sidebar-muted)] transition duration-200 hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <span className="flex size-8 items-center justify-center rounded-lg transition group-hover:bg-white/10">
                  <Settings2
                    aria-hidden="true"
                    className="wf-icon-motion size-[18px]"
                    strokeWidth={1.9}
                  />
                </span>
                Settings
              </Link>
            </nav>

            <div className="shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <ThemeToggleButton className="mb-3" />
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
                <Link
                  href="/profile"
                  onClick={() => closeNavigation(false)}
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
                    <LogOut aria-hidden="true" className="wf-icon-motion size-4" />
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>,
        document.body
      ) : null}
    </>
  )
}
