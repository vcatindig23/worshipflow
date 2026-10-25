"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ContactRound,
  LogOut,
  Mail,
  MessageCircle,
  Settings2,
  UsersRound,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

const inviteHref = "/settings/team#invite-member"

function Shortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium leading-none text-[var(--muted)]">
      {children}
    </kbd>
  )
}

export default function AccountOptionsMenu({
  canManageTeam,
}: {
  canManageTeam: boolean
}) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setInviteOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      setOpen(false)
      setInviteOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  useEffect(() => {
    function handleShortcuts(event: KeyboardEvent) {
      if (!(event.altKey && event.shiftKey) || event.ctrlKey || event.metaKey) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }

      const routes: Record<string, string> = {
        p: "/profile",
        m: "/my-schedule",
        s: "/settings",
      }

      if (canManageTeam) {
        routes.i = inviteHref
      }

      const route = routes[event.key.toLowerCase()]
      if (!route) return

      event.preventDefault()
      setOpen(false)
      setInviteOpen(false)
      router.push(route)
    }

    document.addEventListener("keydown", handleShortcuts)
    return () => document.removeEventListener("keydown", handleShortcuts)
  }, [canManageTeam, router])

  function closeMenu() {
    setOpen(false)
    setInviteOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="account-options-panel"
        onClick={() => {
          setOpen((current) => !current)
          setInviteOpen(false)
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)]/35 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
      >
        Options
        <ChevronDown
          aria-hidden="true"
          className={`size-4 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id="account-options-panel"
          aria-label="Account options"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(19rem,calc(100vw-1.5rem))] wf-menu overflow-visible"
        >
          <div className="px-3 pb-2 pt-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              My Account
            </p>
          </div>

          <nav aria-label="Account options">
            <Link
              href="/profile"
              onClick={closeMenu}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
            >
              <ContactRound aria-hidden="true" className="size-4 text-[var(--muted)]" />
              <span>Profile</span>
              <Shortcut>Alt ⇧ P</Shortcut>
            </Link>

            <Link
              href="/my-schedule"
              onClick={closeMenu}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
            >
              <CalendarDays aria-hidden="true" className="size-4 text-[var(--muted)]" />
              <span>My Schedule</span>
              <Shortcut>Alt ⇧ M</Shortcut>
            </Link>

            <Link
              href="/settings"
              onClick={closeMenu}
              className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
            >
              <Settings2 aria-hidden="true" className="size-4 text-[var(--muted)]" />
              <span>Settings</span>
              <Shortcut>Alt ⇧ S</Shortcut>
            </Link>
          </nav>

          {canManageTeam ? (
            <>
              <div className="my-1.5 border-t border-[var(--border)]" />

              <button
                type="button"
                aria-expanded={inviteOpen}
                aria-controls="account-options-invite-panel"
                onClick={() => setInviteOpen((current) => !current)}
                className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
              >
                <UsersRound aria-hidden="true" className="size-4 text-[var(--muted)]" />
                <span className="flex-1">Invite users</span>
                <ChevronRight
                  aria-hidden="true"
                  className={`size-4 text-[var(--muted)] transition-transform ${inviteOpen ? "rotate-90" : ""}`}
                />
              </button>

              {inviteOpen ? (
                <div
                  id="account-options-invite-panel"
                  aria-label="Invite users"
                  className="ml-5 mt-1 space-y-1 border-l border-[var(--border)] pl-2"
                >
                  <Link
                    href={inviteHref}
                    onClick={closeMenu}
                    className="flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                  >
                    <Mail aria-hidden="true" className="size-4 text-[var(--muted)]" />
                    Email
                  </Link>
                  <Link
                    href={inviteHref}
                    onClick={closeMenu}
                    className="flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                  >
                    <MessageCircle aria-hidden="true" className="size-4 text-[var(--muted)]" />
                    Message
                  </Link>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="my-1.5 border-t border-[var(--border)]" />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
