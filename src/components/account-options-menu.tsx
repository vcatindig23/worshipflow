"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ContactRound,
  Mail,
  MessageCircle,
  Settings2,
  UserRound,
  UsersRound,
  LogOut,
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

export default function AccountOptionsMenu() {
  const pathname = usePathname()
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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        setInviteOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (!(event.altKey && event.shiftKey) || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return

      const routes: Record<string, string> = {
        p: "/profile",
        m: "/my-schedule",
        s: "/settings",
        i: inviteHref,
      }
      const route = routes[event.key.toLowerCase()]
      if (route) {
        event.preventDefault()
        setOpen(false)
        setInviteOpen(false)
        router.push(route)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, router])

  useEffect(() => {
    setOpen(false)
    setInviteOpen(false)
  }, [pathname])

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
          setInviteOpen(false)
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)]/35 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
      >
        Options
        <ChevronDown className={`size-4 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account options"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(19rem,calc(100vw-1.5rem))] overflow-visible rounded-2xl border border-[var(--border)] bg-white p-1.5 text-[var(--foreground)] shadow-[0_24px_70px_-24px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.03] animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 pb-2 pt-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              My Account
            </p>
          </div>

          <Link
            role="menuitem"
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
          >
            <ContactRound className="size-4 text-[var(--muted)]" />
            <span>Profile</span>
            <Shortcut>Alt ⇧ P</Shortcut>
          </Link>

          <Link
            role="menuitem"
            href="/my-schedule"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
          >
            <CalendarDays className="size-4 text-[var(--muted)]" />
            <span>My Schedule</span>
            <Shortcut>Alt ⇧ M</Shortcut>
          </Link>

          <Link
            role="menuitem"
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
          >
            <Settings2 className="size-4 text-[var(--muted)]" />
            <span>Settings</span>
            <Shortcut>Alt ⇧ S</Shortcut>
          </Link>

          <div className="my-1.5 border-t border-[var(--border)]" />

          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={inviteOpen}
            onClick={() => setInviteOpen((current) => !current)}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
          >
            <UsersRound className="size-4 text-[var(--muted)]" />
            <span className="flex-1">Invite users</span>
            <ChevronRight className={`size-4 text-[var(--muted)] transition-transform ${inviteOpen ? "rotate-90" : ""}`} />
          </button>

          {inviteOpen ? (
            <div role="menu" aria-label="Invite users" className="ml-5 mt-1 space-y-1 border-l border-[var(--border)] pl-2">
              <Link
                role="menuitem"
                href={inviteHref}
                onClick={() => {
                  setOpen(false)
                  setInviteOpen(false)
                }}
                className="flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
              >
                <Mail className="size-4 text-[var(--muted)]" />
                Email
              </Link>
              <Link
                role="menuitem"
                href={inviteHref}
                onClick={() => {
                  setOpen(false)
                  setInviteOpen(false)
                }}
                className="flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
              >
                <MessageCircle className="size-4 text-[var(--muted)]" />
                Message
              </Link>
            </div>
          ) : null}

          <div className="my-1.5 border-t border-[var(--border)]" />

          <form action="/auth/signout" method="post">
            <button
              role="menuitem"
              type="submit"
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
