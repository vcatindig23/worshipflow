"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  AtSign,
  Bell,
  CalendarDays,
  CheckCheck,
  LoaderCircle,
  ListMusic,
  Music2,
  MessagesSquare,
  Search,
  Users,
  X,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { createPortal } from "react-dom"
import { describeActivity, type ActivityEntry } from "@/lib/activity-log"

import { searchWorkspaceLive } from "@/app/search/actions"
import {
  loadNotificationPreview,
  markHeaderNotificationRead,
  markHeaderNotificationsRead,
} from "@/app/notifications/dropdown-actions"

type HeaderNotification = {
  id: string
  type: string
  title: string
  body: string
  setlist_id: string | null
  read_at: string | null
  created_at: string
}

type HeaderActivity = ActivityEntry & {
  id: string
  entity_type: "song" | "service" | "member"
  entity_id: string | null
  created_at: string
}

type CombinedFeedItem =
  | {
      kind: "notification"
      id: string
      created_at: string
      notification: HeaderNotification
    }
  | {
      kind: "activity"
      id: string
      created_at: string
      activity: HeaderActivity
    }

type WorkspaceHeaderActionsProps = {
  searchOpen?: boolean
  onOpenSearch?: () => void
  onCloseSearch?: () => void
  unreadChatCount?: number
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

type SearchResultTarget = {
  key: string
  href: string
  label: string
}

function subscribeToMountedState() {
  return () => {}
}

function getMountedStateSnapshot() {
  return true
}

function getServerMountedStateSnapshot() {
  return false
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

function activityHref(activity: HeaderActivity) {
  if (
    !activity.entity_id ||
    activity.action === "song.deleted" ||
    activity.action === "service.deleted"
  ) {
    return "/activity"
  }

  if (activity.entity_type === "song") {
    return `/songs/${activity.entity_id}`
  }

  if (activity.entity_type === "service") {
    return `/setlists/${activity.entity_id}`
  }

  return "/settings/team"
}

function ActivityFeedIcon({ type }: { type: HeaderActivity["entity_type"] }) {
  const Icon =
    type === "song" ? Music2 : type === "service" ? CalendarDays : Users

  return <Icon className="wf-icon-motion size-4 group-hover:scale-110" />
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "team_chat_mention") {
    return <AtSign className="size-4" />
  }

  if (type === "team_chat_message") {
    return <Bell className="wf-icon-motion size-4 group-hover:scale-110" />
  }

  return <CalendarDays className="wf-icon-motion size-4 group-hover:scale-110" />
}

export default function WorkspaceHeaderActions({
  searchOpen: controlledSearchOpen,
  onOpenSearch: onOpenSearchProp,
  onCloseSearch: onCloseSearchProp,
  unreadChatCount = 0,
}: WorkspaceHeaderActionsProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [internalSearchOpen, setInternalSearchOpen] = useState(false)
  const searchOpen = controlledSearchOpen ?? internalSearchOpen
  const onOpenSearch = useCallback(() => {
    if (onOpenSearchProp) {
      onOpenSearchProp()
    } else {
      setInternalSearchOpen(true)
    }
  }, [onOpenSearchProp])
  const onCloseSearch = useCallback(() => {
    if (onCloseSearchProp) {
      onCloseSearchProp()
    } else {
      setInternalSearchOpen(false)
    }
  }, [onCloseSearchProp])
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const searchDialogRef = useRef<HTMLElement>(null)
  const searchReturnFocusRef = useRef<HTMLElement | null>(null)
  const openSearchAndRememberFocus = useCallback(() => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      searchReturnFocusRef.current = activeElement
    }
    onOpenSearch()
  }, [onOpenSearch])
  const closeSearchAndRestoreFocus = useCallback(() => {
    onCloseSearch()
    const returnTarget = searchReturnFocusRef.current ?? searchButtonRef.current
    searchReturnFocusRef.current = null
    window.requestAnimationFrame(() => {
      if (returnTarget?.isConnected) {
        returnTarget.focus({ preventScroll: true })
      }
    })
  }, [onCloseSearch])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationPanelPosition, setNotificationPanelPosition] = useState<{
    top: number
    right: number
  } | null>(null)
  const isBrowserMounted = useSyncExternalStore(
    subscribeToMountedState,
    getMountedStateSnapshot,
    getServerMountedStateSnapshot
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  const [activities, setActivities] = useState<HeaderActivity[]>([])
  const [activityError, setActivityError] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [liveUnreadChatCount, setLiveUnreadChatCount] = useState(unreadChatCount)
  const [notificationUserId, setNotificationUserId] = useState<string | null>(null)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [notificationError, setNotificationError] = useState("")
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notificationsMenuRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const notificationsPanelRef = useRef<HTMLElement>(null)
  const notificationTitleRef = useRef<HTMLHeadingElement>(null)
  const notificationsReturnFocusRef = useRef<HTMLElement | null>(null)
  const notificationRefreshTimeoutRef = useRef<number | null>(null)
  const supabase = useMemo(() => createBrowserClient(), [])
  const searchResultTargets = useMemo<SearchResultTarget[]>(() => {
    if (!searchResults) return []

    return [
      ...searchResults.songs.map((song) => ({
        key: `song:${song.id}`,
        href: `/songs/${song.id}`,
        label: `Song: ${song.title}${song.artist ? `, ${song.artist}` : song.album ? `, ${song.album}` : ""}`,
      })),
      ...searchResults.setlists.map((setlist) => ({
        key: `setlist:${setlist.id}`,
        href: `/setlists/${setlist.id}`,
        label: `Setlist or service: ${setlist.name}`,
      })),
    ]
  }, [searchResults])

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
      setActivities(result.activities)
      setActivityError(result.activityError)
      setUnreadCount(result.unreadCount)
      setLiveUnreadChatCount(result.unreadChatCount)
      setNotificationUserId(result.userId)
    } catch {
      setNotificationError("Notifications could not be loaded. Please try again.")
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])

  const feedItems = useMemo<CombinedFeedItem[]>(() => [
    ...notifications.map((notification) => ({
      kind: "notification" as const,
      id: `notification:${notification.id}`,
      created_at: notification.created_at,
      notification,
    })),
    ...activities.map((activity) => ({
      kind: "activity" as const,
      id: `activity:${activity.id}`,
      created_at: activity.created_at,
      activity,
    })),
  ].sort((first, second) =>
    new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  ).slice(0, 12), [activities, notifications])

  useEffect(() => {
    // Start the initial remote-data sync after this render is committed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshNotifications()
  }, [refreshNotifications])

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshNotifications()
      }
    }

    window.addEventListener("focus", refreshWhenVisible)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.removeEventListener("focus", refreshWhenVisible)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
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
      openSearchAndRememberFocus()
    }

    document.addEventListener("keydown", handleSearchShortcut)
    return () => document.removeEventListener("keydown", handleSearchShortcut)
  }, [openSearchAndRememberFocus])

  useEffect(() => {
    if (!searchOpen) return

    const dialog = searchDialogRef.current
    if (!dialog) return

    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const initialFocusFrame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true })
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeSearchAndRestoreFocus()
        return
      }

      if (event.key !== "Tab") return

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'a[href]:not([aria-disabled="true"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstFocusable = focusableElements.item(0)
      const lastFocusable = focusableElements.item(focusableElements.length - 1)

      if (!firstFocusable || !lastFocusable) {
        event.preventDefault()
        dialog.focus()
        return
      }

      if (
        event.shiftKey &&
        (document.activeElement === firstFocusable ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === lastFocusable ||
          !dialog.contains(document.activeElement))
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
  }, [searchOpen, closeSearchAndRestoreFocus])

  useEffect(() => {
    if (!searchOpen) {
      // Reset search UI state when the controlled or internal dialog closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          if (notificationRefreshTimeoutRef.current) {
            window.clearTimeout(notificationRefreshTimeoutRef.current)
          }

          notificationRefreshTimeoutRef.current = window.setTimeout(() => {
            notificationRefreshTimeoutRef.current = null
            void refreshNotifications()
          }, 200)
        }
      )
      .subscribe()

    return () => {
      if (notificationRefreshTimeoutRef.current) {
        window.clearTimeout(notificationRefreshTimeoutRef.current)
        notificationRefreshTimeoutRef.current = null
      }
      void supabase.removeChannel(channel)
    }
  }, [notificationUserId, refreshNotifications, supabase])

  useEffect(() => {
    function handleOpenSearchRequest() {
      setNotificationsOpen(false)
      openSearchAndRememberFocus()
    }

    function handleOpenNotificationsRequest() {
      onCloseSearch()
      notificationsReturnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : notificationButtonRef.current
      setNotificationsOpen(true)
      void refreshNotifications()
    }

    window.addEventListener("worshipflow:open-global-search", handleOpenSearchRequest)
    window.addEventListener("worshipflow:open-notifications", handleOpenNotificationsRequest)

    return () => {
      window.removeEventListener("worshipflow:open-global-search", handleOpenSearchRequest)
      window.removeEventListener("worshipflow:open-notifications", handleOpenNotificationsRequest)
    }
  }, [closeSearchAndRestoreFocus, onCloseSearch, openSearchAndRememberFocus, refreshNotifications])

  useEffect(() => {
    if (!notificationsOpen) return

    function updateNotificationPanelPosition() {
      const trigger = notificationButtonRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const panelWidth = Math.min(390, window.innerWidth * 0.92)
      const maximumRight = Math.max(8, window.innerWidth - panelWidth - 8)
      const right = Math.max(
        8,
        Math.min(maximumRight, window.innerWidth - rect.right)
      )

      setNotificationPanelPosition({
        top: Math.round(rect.bottom + 8),
        right: Math.round(right),
      })
    }

    updateNotificationPanelPosition()
    window.addEventListener("resize", updateNotificationPanelPosition)
    window.addEventListener("scroll", updateNotificationPanelPosition, true)

    return () => {
      window.removeEventListener("resize", updateNotificationPanelPosition)
      window.removeEventListener("scroll", updateNotificationPanelPosition, true)
    }
  }, [notificationsOpen])

  useEffect(() => {
    if (!notificationsOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      const clickedTrigger = notificationsMenuRef.current?.contains(target)
      const clickedPanel = notificationsPanelRef.current?.contains(target)

      if (!clickedTrigger && !clickedPanel) {
        setNotificationsOpen(false)
        notificationsReturnFocusRef.current = null
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return

      event.preventDefault()
      setNotificationsOpen(false)
      const returnTarget =
        notificationsReturnFocusRef.current ?? notificationButtonRef.current
      notificationsReturnFocusRef.current = null
      returnTarget?.focus()
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [notificationsOpen])

  useEffect(() => {
    if (!notificationsOpen) return

    const frame = window.requestAnimationFrame(() => {
      notificationTitleRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [notificationsOpen])

  useEffect(() => {
    // Route changes should always dismiss transient search and notification panels.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotificationsOpen(false)
    onCloseSearch()
  }, [pathname, onCloseSearch])

  function handleSearchInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (searchResultTargets.length === 0 || isSearching) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveSearchResultIndex((current) =>
        current >= searchResultTargets.length - 1 ? 0 : current + 1
      )
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveSearchResultIndex((current) =>
        current <= 0 ? searchResultTargets.length - 1 : current - 1
      )
      return
    }

    if (event.key === "Enter" && searchResultTargets.length > 0) {
      event.preventDefault()
      const target =
        searchResultTargets[
          Math.min(activeSearchResultIndex, searchResultTargets.length - 1)
        ] ?? searchResultTargets[0]

      if (target) {
        onCloseSearch()
        router.push(target.href)
      }
    }
  }

  function toggleSearch() {
    setNotificationsOpen(false)
    if (searchOpen) {
      closeSearchAndRestoreFocus()
    } else {
      openSearchAndRememberFocus()
    }
  }

  function toggleNotifications() {
    onCloseSearch()
    if (!notificationsOpen) {
      notificationsReturnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : notificationButtonRef.current
    } else {
      notificationsReturnFocusRef.current = null
    }
    setNotificationsOpen((open) => !open)
    void refreshNotifications()
  }

  function closeNotificationsAndRestoreFocus() {
    setNotificationsOpen(false)
    const returnTarget =
      notificationsReturnFocusRef.current ?? notificationButtonRef.current
    notificationsReturnFocusRef.current = null
    returnTarget?.focus()
  }

  function openActivity(activity: HeaderActivity) {
    setNotificationsOpen(false)
    router.push(activityHref(activity))
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
        if (
          notification.type === "team_chat_message" ||
          notification.type === "team_chat_mention"
        ) {
          setLiveUnreadChatCount((count) => Math.max(0, count - 1))
        }

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
        setLiveUnreadChatCount(0)
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
        ref={searchButtonRef}
        type="button"
        onClick={toggleSearch}
        aria-label={searchOpen ? "Close global search" : "Open global search"}
        aria-haspopup="dialog"
        aria-controls="workspace-global-search"
        aria-expanded={searchOpen}
        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--muted)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)]/35 hover:bg-[var(--surface)] hover:text-[var(--foreground)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
      >
        <Search className="wf-icon-motion size-4 group-hover:scale-110 group-hover:-rotate-6" />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          /
        </span>
      </button>

      <Link
        href="/chat"
        title="Team Chat"
        aria-label={liveUnreadChatCount > 0 ? `Team Chat, ${liveUnreadChatCount} unread updates` : "Team Chat"}
        className="group relative flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--brand)]/35 hover:bg-[var(--surface)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
      >
        <MessagesSquare className="wf-icon-motion size-[18px] group-hover:scale-110 group-hover:-rotate-3" />
        {liveUnreadChatCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--background)] bg-red-600 px-1 text-[9px] font-bold text-white">
            {liveUnreadChatCount > 99 ? "99+" : liveUnreadChatCount}
          </span>
        ) : null}
      </Link>

      <div className="relative" ref={notificationsMenuRef}>
        <button
          ref={notificationButtonRef}
          type="button"
          onClick={toggleNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
          className="relative flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm transition hover:border-[var(--brand)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20"
        >
          <Bell className="wf-icon-motion wf-bell-icon size-[18px]" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--background)] bg-red-600 px-1 text-[9px] font-bold text-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        {notificationsOpen && isBrowserMounted && notificationPanelPosition ? createPortal(
          <section
            ref={notificationsPanelRef}
            id="workspace-notifications-panel"
            role="dialog"
            aria-labelledby="workspace-notifications-title"
            tabIndex={-1}
            style={{
              top: notificationPanelPosition.top,
              right: notificationPanelPosition.right,
            }}
            className="fixed z-[100] flex max-h-[min(75vh,620px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
              <div>
                <h2
                  ref={notificationTitleRef}
                  id="workspace-notifications-title"
                  tabIndex={-1}
                  className="rounded-sm text-base font-bold text-[var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                >
                  Notifications & Activity
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {unreadCount === 0 ? "Recent workspace updates" : `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void handleMarkAllRead()}
                    disabled={isMarkingAllRead}
                    className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--brand-soft)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                  >
                    {isMarkingAllRead ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="wf-icon-motion size-3.5 group-hover:scale-110" />
                    )}
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeNotificationsAndRestoreFocus}
                  aria-label="Close notifications"
                  title="Close notifications"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {notificationError ? (
              <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
                {notificationError}
              </p>
            ) : null}

            {activityError ? (
              <p role="status" className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                {activityError}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoadingNotifications && feedItems.length === 0 ? (
                <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[var(--muted)]">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading notifications and activity…
                </div>
              ) : feedItems.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Bell className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                    No new updates
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Notifications and changes to songs, services, and team members will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {feedItems.map((feedItem) => {
                    if (feedItem.kind === "activity") {
                      const activity = feedItem.activity

                      return (
                        <li key={feedItem.id}>
                          <button
                            type="button"
                            onClick={() => openActivity(activity)}
                            className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]/25"
                          >
                            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--brand)] ring-1 ring-[var(--border)]">
                              <ActivityFeedIcon type={activity.entity_type} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--brand)]">
                                Workspace activity
                              </span>
                              <span className="block text-sm font-semibold leading-5 text-[var(--foreground)]">
                                {describeActivity(activity)}
                              </span>
                              <span className="mt-1 block truncate text-xs text-[var(--muted)]">
                                by {activity.actor_name}
                              </span>
                              <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[var(--muted)]">
                                {formatNotificationTime(activity.created_at)}
                                <span>· Open activity</span>
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    }

                    const notification = feedItem.notification
                    const href = notificationHref(notification)
                    const isBusy = busyNotificationId === notification.id

                    return (
                      <li key={feedItem.id}>
                        <button
                          type="button"
                          onClick={() => void openNotification(notification)}
                          disabled={isBusy}
                          className={`group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]/25 disabled:opacity-60 ${notification.read_at ? "bg-white" : "bg-[var(--brand-soft)]/40"}`}
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
            <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <Link
                href="/activity"
                onClick={() => setNotificationsOpen(false)}
                className="text-xs font-semibold text-[var(--brand)] hover:underline"
              >
                View all activity
              </Link>
              <span className="text-[10px] text-[var(--muted)]">
                {activities.length} recent activity {activities.length === 1 ? "item" : "items"}
              </span>
            </div>
          </section>
          ,
          document.body
        ) : null}
      </div>

      {searchOpen && isBrowserMounted
        ? createPortal(
                    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/35 px-3 py-8 backdrop-blur-[2px] sm:px-6">
                      <button
                        type="button"
                        aria-label="Close global search"
                        onClick={closeSearchAndRestoreFocus}
                        className="absolute inset-0 h-full w-full cursor-default"
                      />
                      <section
                        ref={searchDialogRef}
                        id="workspace-global-search"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Global search"
                        tabIndex={-1}
                        className="relative mx-auto mt-[4vh] flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl sm:mt-[8vh]"
                      >
                        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-5">
                          <Search className="size-5 shrink-0 text-[var(--brand)]" />
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">Search songs, artists, albums, setlists, and services</span>
                            <input
                              ref={searchInputRef}
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck={false}
                              type="search"
                              value={searchQuery}
                              maxLength={100}
                              onChange={(event) => {
                                setSearchQuery(event.target.value)
                                setActiveSearchResultIndex(0)
                              }}
                              onKeyDown={handleSearchInputKeyDown}
                              aria-controls="workspace-global-search-results"
                              aria-keyshortcuts="ArrowDown ArrowUp Enter Escape"
                              placeholder="Search songs, artists, albums, setlists, services…"
                              className="h-9 w-full border-0 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:ring-0"
                            />
                          </label>
                          <button
                            type="button"
                            aria-label="Close search"
                            onClick={closeSearchAndRestoreFocus}
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
                          >
                            <X className="wf-icon-motion size-4 group-hover:rotate-90" />
                          </button>
                        </div>
            
                        <div id="workspace-global-search-results" className="min-h-[220px] flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                          {searchQuery.trim().length < 2 ? (
                            <div className="flex min-h-[190px] flex-col items-center justify-center text-center">
                              <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                                <Search className="size-5" />
                              </span>
                              <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                                Search your workspace
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                Type at least 2 characters to find songs, artists, albums, and setlists.
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
                              <p className="mt-1 text-xs text-[var(--muted)]">Try a song title, artist, album, or setlist name.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {searchResults.songs.length > 0 ? (
                                <section aria-labelledby="live-search-songs">
                                  <h3 id="live-search-songs" className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                                    Songs
                                  </h3>
                                  <ul className="space-y-1">
                                    {searchResults.songs.map((song, index) => (
                                      <li key={song.id}>
                                        <Link
                                          href={`/songs/${song.id}`}
                                          onClick={onCloseSearch}
                                          onMouseEnter={() => setActiveSearchResultIndex(index)}
                                          className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20 ${activeSearchResultIndex === index ? "bg-[var(--brand-soft)]" : ""}`}
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
                                    {searchResults.setlists.map((setlist, index) => (
                                      <li key={setlist.id}>
                                        <Link
                                          href={`/setlists/${setlist.id}`}
                                          onClick={onCloseSearch}
                                          onMouseEnter={() => setActiveSearchResultIndex(searchResults.songs.length + index)}
                                          className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/20 ${activeSearchResultIndex === searchResults.songs.length + index ? "bg-[var(--brand-soft)]" : ""}`}
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
                        <div
                          role="status"
                          aria-live="polite"
                          aria-atomic="true"
                          className="sr-only"
                        >
                          {isSearching
                            ? "Searching your workspace."
                            : searchResults
                              ? searchResultTargets.length > 0
                                ? `${searchResultTargets.length} search ${searchResultTargets.length === 1 ? "result" : "results"} available. Selected result ${activeSearchResultIndex + 1}: ${searchResultTargets[Math.min(activeSearchResultIndex, searchResultTargets.length - 1)]?.label}. Press Enter to open.`
                                : "No search results available."
                              : ""}
                        </div>
                        <div className="flex flex-col gap-1 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[10px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                          <span>Results update as you type. Search is limited to your current church workspace.</span>
                          <span className="whitespace-nowrap">↑ ↓ Navigate · Enter Open · Esc Close</span>
                        </div>
                      </section>
                    </div>
            
          ,
          document.body
        )
        : null}
    </div>
  )
}
