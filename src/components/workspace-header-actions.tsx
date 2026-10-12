"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  AtSign,
  Bell,
  CalendarDays,
  CheckCheck,
  LoaderCircle,
  ListMusic,
  Music2,
  Search,
  X,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { searchWorkspaceLive } from "@/app/search/actions"
import {
  loadNotificationPreview,
  markHeaderNotificationRead,
  markHeaderNotificationsRead,
  type HeaderNotification,
} from "@/app/notifications/dropdown-actions"

type WorkspaceHeaderActionsProps = {
  searchOpen: boolean
  onOpenSearch: () => void
  onCloseSearch: () => void
}

type SearchSong = {
  id: string
  title: string
  artist: string | null
  album: string | null
  status: "active" | "archived"
}

type SearchSetlist = {
  id: string
  name: string
  service_date: string | null
  status: "draft" | "published" | "archived"
}

type SearchResults = {
  songs: SearchSong[]
  setlists: SearchSetlist[]
}

function formatNotificationTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  const now = Date.now()
  const elapsed = Math.max(0, now - date.getTime())
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (elapsed < minute) return "Just now"
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m ago`
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d ago`

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date)
}

function notificationHref(notification: HeaderNotification) {
  if (
    notification.type === "team_chat_message" ||
    notification.type === "team_chat_mention"
  ) {
    return "/chat"
  }

  if (notification.setlist_id) {
    return `/setlists/${notification.setlist_id}`
  }

  return null
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "team_chat_mention") {
    return <AtSign className="size-4" />
  }

  if (type === "team_chat_message") {
    return <Bell className="size-4" />
  }

  return <CalendarDays className="size-4" />
}

export default function WorkspaceHeaderActions({
  searchOpen,
  onOpenSearch,
  onCloseSearch,
}: WorkspaceHeaderActionsProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationUserId, setNotificationUserId] = useState<string | null>(null)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [notificationError, setNotificationError] = useState("")
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notificationsMenuRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createBrowserClient(), [])

  const refreshNotifications = useCallback(async () => {
    setIsLoadingNotifications(true)
    setNotificationError("")

    try {
      const result = await loadNotificationPreview()

      if (!result.success) {
        setNotificationError(result.error)
        return
      }

      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setNotificationUserId(result.userId)
    } catch {
      setNotificationError("Notifications could not be loaded. Please try again.")
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }

      event.preventDefault()
      setNotificationsOpen(false)
      onOpenSearch()
    }

    document.addEventListener("keydown", handleSearchShortcut)
    return () => document.removeEventListener("keydown", handleSearchShortcut)
  }, [onOpenSearch])

  useEffect(() => {
    if (!searchOpen) return

    searchInputRef.current?.focus()

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseSearch()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [searchOpen, onCloseSearch])

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("")
      setSearchResults(null)
      setSearchError("")
      setIsSearching(false)
      return
    }

    const query = searchQuery.trim()

    if (query.length < 2) {
      setSearchResults(null)
      setSearchError("")
      setIsSearching(false)
      return
    }

    let cancelled = false
    setIsSearching(true)
    setSearchError("")

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await searchWorkspaceLive(query)
        if (cancelled) return

        if (!result.success) {
          setSearchResults(null)
          setSearchError(result.error)
          return
        }

        setSearchResults({
          songs: result.songs as SearchSong[],
          setlists: result.setlists as SearchSetlist[],
        })
      } catch {
        if (!cancelled) {
          setSearchResults(null)
          setSearchError("Search is temporarily unavailable. Please try again.")
        }
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [searchOpen, searchQuery])

  useEffect(() => {
    if (!notificationUserId) return

    const channel = supabase
      .channel(`header-notifications:${notificationUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${notificationUserId}`,
        },
        () => {
          void refreshNotifications()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [notificationUserId, refreshNotifications, supabase])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [])

  useEffect(() => {
    setNotificationsOpen(false)
    onCloseSearch()
  }, [pathname, onCloseSearch])

  function toggleSearch() {
    setNotificationsOpen(false)
    if (searchOpen) {
      onCloseSearch()
    } else {
      onOpenSearch()
    }
  }

  function toggleNotifications() {
    onCloseSearch()
    setNotificationsOpen((open) => !open)
    void refreshNotifications()
  }

  async function openNotification(notification: HeaderNotification) {
    setBusyNotificationId(notification.id)
    const href = notificationHref(notification)

    try {
      if (!notification.read_at) {
        const now = new Date().toISOString()
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read_at: now } : item
          )
        )
        setUnreadCount((count) => Math.max(0, count - 1))

        const result = await markHeaderNotificationRead(notification.id)
        if (!result.success) {
          setNotificationError(result.error)
          void refreshNotifications()
        }
      }
    } catch {
      setNotificationError("The notification could not be updated. Please try again.")
      void refreshNotifications()
    } finally {
      setBusyNotificationId(null)
    }

    setNotificationsOpen(false)

    if (href) {
      router.push(href)
    }
  }

  async function handleMarkAllRead() {
    if (isMarkingAllRead || unreadCount === 0) return

    setIsMarkingAllRead(true)
    setNotificationError("")

    try {
      const result = await markHeaderNotificationsRead()

      if (result.success) {
        const now = new Date().toISOString()
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            read_at: notification.read_at ?? now,
          }))
        )
        setUnreadCount(0)
      } else {
        setNotificationError(result.error)
      }
    } catch {
      setNotificationError("Notifications could not be marked as read. Please try again.")
    } finally {
      setIsMarkingAllRead(false)
      void refreshNotifications()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleSearch}
        aria-label="Open global search"
        aria-haspopup="dialog"
        aria-expanded={searchOpen}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--muted)] shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          /
        </span>
      </button>

      <div className="relative" ref={notificationsMenuRef}>
        <button
          type="button"
          onClick={toggleNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
          className="relative flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--background)] bg-red-600 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        {notificationsOpen ? (
          <section
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 top-[calc(100%+10px)] z-[70] flex max-h-[min(75vh,620px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">Notifications</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {unreadCount === 0 ? "You’re all caught up" : `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`}
                </p>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={isMarkingAllRead}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)] disabled:opacity-50"
                >
                  {isMarkingAllRead ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="size-3.5" />
                  )}
                  Mark all read
                </button>
              ) : null}
            </div>

            {notificationError ? (
              <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {notificationError}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoadingNotifications && notifications.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[var(--muted)]">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading notifications…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Bell className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                    You’re all caught up
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Team messages and service assignment updates will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {notifications.map((notification) => {
                    const href = notificationHref(notification)
                    const isBusy = busyNotificationId === notification.id

                    return (
                      <li key={notification.id}>
                        <button
                          type="button"
                          onClick={() => void openNotification(notification)}
                          disabled={isBusy}
                          className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--surface)] disabled:opacity-60 ${notification.read_at ? "bg-white" : "bg-[var(--brand-soft)]/40"}`}
                        >
                          <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand)] ring-1 ring-[var(--border)]">
                            <NotificationIcon type={notification.type} />
                            {!notification.read_at ? (
                              <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-[var(--brand)]" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold leading-5 text-[var(--foreground)]">
                              {notification.title}
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--muted)]">
                              {notification.body}
                            </span>
                            <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[var(--muted)]">
                              {formatNotificationTime(notification.created_at)}
                              {href ? <span>· Open update</span> : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/35 px-3 py-8 backdrop-blur-[2px] sm:px-6">
          <button
            type="button"
            aria-label="Close global search"
            onClick={onCloseSearch}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="relative mx-auto mt-[4vh] flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl sm:mt-[8vh]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
              <Search className="size-5 shrink-0 text-[var(--brand)]" />
              <label className="min-w-0 flex-1">
                <span className="sr-only">Search songs and setlists</span>
                <input
                  ref={searchInputRef}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  type="search"
                  value={searchQuery}
                  maxLength={100}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search songs, artists, setlists, services…"
                  className="h-9 w-full border-0 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-0"
                />
              </label>
              <button
                type="button"
                aria-label="Close search"
                onClick={onCloseSearch}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-[220px] flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {searchQuery.trim().length < 2 ? (
                <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Search className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                    Search your workspace
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Type at least 2 characters to find songs and setlists.
                  </p>
                </div>
              ) : isSearching ? (
                <div role="status" className="flex min-h-[190px] items-center justify-center gap-2 text-sm text-[var(--muted)]">
                  <LoaderCircle className="size-4 animate-spin" />
                  Searching your workspace…
                </div>
              ) : searchError ? (
                <div role="alert" className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Search unavailable</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{searchError}</p>
                </div>
              ) : !searchResults || (searchResults.songs.length === 0 && searchResults.setlists.length === 0) ? (
                <div className="flex min-h-[190px] flex-col items-center justify-center px-5 text-center">
                  <Search className="size-6 text-[var(--muted)]" />
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">No matches found</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Try a different song, artist, or setlist name.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.songs.length > 0 ? (
                    <section aria-labelledby="live-search-songs">
                      <h3 id="live-search-songs" className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Songs
                      </h3>
                      <ul className="space-y-1">
                        {searchResults.songs.map((song) => (
                          <li key={song.id}>
                            <Link
                              href={`/songs/${song.id}`}
                              onClick={onCloseSearch}
                              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                                <Music2 className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{song.title}</span>
                                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{song.artist || song.album || "Artist not set"}</span>
                              </span>
                              {song.status === "archived" ? (
                                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Archived</span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {searchResults.setlists.length > 0 ? (
                    <section aria-labelledby="live-search-setlists">
                      <h3 id="live-search-setlists" className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                        Setlists and services
                      </h3>
                      <ul className="space-y-1">
                        {searchResults.setlists.map((setlist) => (
                          <li key={setlist.id}>
                            <Link
                              href={`/setlists/${setlist.id}`}
                              onClick={onCloseSearch}
                              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20"
                            >
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                                {setlist.service_date ? <CalendarDays className="size-4" /> : <ListMusic className="size-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{setlist.name}</span>
                                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                                  {setlist.service_date
                                    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${setlist.service_date}T00:00:00Z`))
                                    : "Date not set"}
                                </span>
                              </span>
                              <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
                                {setlist.status.charAt(0).toUpperCase() + setlist.status.slice(1)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[10px] text-[var(--muted)] sm:px-5">
              Results update as you type. Search is limited to your current church workspace.
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
