"use client"

import { Bell, Search } from "lucide-react"

type WorkspaceSidebarActionProps = {
  action: "search" | "notifications"
  label: string
  unreadCount?: number
}

export default function WorkspaceSidebarAction({
  action,
  label,
  unreadCount = 0,
}: WorkspaceSidebarActionProps) {
  const isSearch = action === "search"

  function handleClick() {
    window.dispatchEvent(
      new Event(
        isSearch
          ? "worshipflow:open-global-search"
          : "worshipflow:open-notifications"
      )
    )
  }

  const Icon = isSearch ? Search : Bell

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-haspopup={isSearch ? "dialog" : "dialog"}
      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-[var(--sidebar-muted)] transition hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <Icon className="size-[18px]" strokeWidth={1.8} />
      <span>{label}</span>
      {!isSearch && unreadCount > 0 ? (
        <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  )
}
