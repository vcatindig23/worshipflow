"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import type { FormEvent, ReactNode } from "react"
import { Fragment } from "react"
import {
  AlertCircle,
  Check,
  ChevronUp,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  Send,
  Trash2,
  Wifi,
  X,
  WifiOff,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  deleteTeamChatMessage,
  editTeamChatMessage,
  loadOlderTeamChatMessages,
  markTeamChatNotificationsRead,
  searchTeamChatMessages,
  sendTeamChatMessage,
  setTeamChatMessagePinned,
} from "./actions"

export type TeamChatMessage = {
  id: string
  organization_id: string
  user_id: string
  body: string
  created_at: string
  reply_to_message_id: string | null
  reply_to_user_id: string | null
  reply_to_body: string | null
  pinned_at: string | null
  pinned_by: string | null
  authorName: string
}

export type TeamChatMember = {
  id: string
  displayName: string
  role: string
}

type TeamChatClientProps = {
  organizationId: string
  organizationTimezone: string
  currentUserId: string
  canPinMessages: boolean
  initialMessages: TeamChatMessage[]
  initialPinnedMessages: TeamChatMessage[]
  members: TeamChatMember[]
}

type ConnectionState = "connecting" | "live" | "reconnecting"

type MessageRow = Omit<TeamChatMessage, "authorName">

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "WF"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function normalizeTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-PH", { timeZone: value })
    return value
  } catch {
    return "Asia/Manila"
  }
}

function formatMessageTime(value: string, timeZone: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date)
}

function getMessageDayKey(value: string, timeZone: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "unknown-date"
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return `${part("year")}-${part("month")}-${part("day")}`
}

function formatMessageDate(value: string, timeZone: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
    timeZone,
  }).format(date)
}

function highlightSearchTerm(body: string, query: string): ReactNode {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return body
  }

  const normalizedBody = body.toLocaleLowerCase()
  const normalizedNeedle = normalizedQuery.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let matchIndex = normalizedBody.indexOf(normalizedNeedle, cursor)

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(body.slice(cursor, matchIndex))
    }

    parts.push(
      <mark
        key={matchIndex}
        className="rounded bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-500/40 dark:text-amber-50"
      >
        {body.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>
    )

    cursor = matchIndex + normalizedQuery.length
    matchIndex = normalizedBody.indexOf(normalizedNeedle, cursor)
  }

  if (cursor < body.length) {
    parts.push(body.slice(cursor))
  }

  return parts.length > 0 ? parts : body
}

export default function TeamChatClient({
  organizationId,
  organizationTimezone,
  currentUserId,
  canPinMessages,
  initialMessages,
  initialPinnedMessages,
  members,
}: TeamChatClientProps) {
  const chatTimeZone = useMemo(
    () => normalizeTimeZone(organizationTimezone || "Asia/Manila"),
    [organizationTimezone]
  )
  const [messages, setMessages] = useState(initialMessages)
  const [pinnedMessages, setPinnedMessages] = useState(initialPinnedMessages)
  const [isPinningMessage, startPinningMessage] = useTransition()
  const [hasMoreMessages, setHasMoreMessages] = useState(
    initialMessages.length === 100
  )
  const [historyError, setHistoryError] = useState("")
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [replyingTo, setReplyingTo] = useState<TeamChatMessage | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [searchResults, setSearchResults] = useState<TeamChatMessage[] | null>(null)
  const [searchError, setSearchError] = useState("")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")
  const [isPending, startTransition] = useTransition()
  const [isSavingEdit, startSavingEdit] = useTransition()
  const [isDeletingMessage, startDeletingMessage] = useTransition()
  const [isLoadingOlder, startLoadingOlder] = useTransition()
  const [isSearching, startSearching] = useTransition()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousScrollPositionRef = useRef<{
    scrollHeight: number
    scrollTop: number
  } | null>(null)
  const supabase = useMemo(() => createBrowserClient(), [])
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const remoteTypingTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const lastTypingBroadcastAtRef = useRef(0)
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.displayName])),
    [members]
  )

  useEffect(() => {
    void markTeamChatNotificationsRead()
  }, [organizationId])

  useEffect(() => {
    const channel = supabase
      .channel(`team-chat:${organizationId}`, {
        config: { private: true },
      })
      .on(
        "broadcast",
        { event: "typing" },
        (event: { payload: Record<string, unknown> }) => {
          const userId = event.payload.user_id

          if (typeof userId !== "string" || userId === currentUserId) {
            return
          }

          if (event.payload.is_typing === true) {
            setTypingUserIds((current) =>
              current.includes(userId) ? current : [...current, userId]
            )

            const previousTimeout = remoteTypingTimeoutsRef.current.get(userId)
            if (previousTimeout) {
              clearTimeout(previousTimeout)
            }

            const timeout = setTimeout(() => {
              setTypingUserIds((current) =>
                current.filter((typingUserId) => typingUserId !== userId)
              )
              remoteTypingTimeoutsRef.current.delete(userId)
            }, 2200)

            remoteTypingTimeoutsRef.current.set(userId, timeout)
            return
          }

          const previousTimeout = remoteTypingTimeoutsRef.current.get(userId)
          if (previousTimeout) {
            clearTimeout(previousTimeout)
            remoteTypingTimeoutsRef.current.delete(userId)
          }

          setTypingUserIds((current) =>
            current.filter((typingUserId) => typingUserId !== userId)
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_messages",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as MessageRow

          if (
            !row ||
            typeof row.id !== "string" ||
            typeof row.user_id !== "string"
          ) {
            return
          }

          const incomingMessage: TeamChatMessage = {
            ...row,
            authorName: memberNames.get(row.user_id) ?? "Team member",
          }

          if (row.user_id !== currentUserId) {
            void markTeamChatNotificationsRead()
          }

          setMessages((current) => {
            if (current.some((message) => message.id === incomingMessage.id)) {
              return current
            }

            return [...current, incomingMessage]
              .sort(
                (first, second) =>
                  new Date(first.created_at).getTime() -
                  new Date(second.created_at).getTime()
              )
              .slice(-100)
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_chat_messages",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new

          if (typeof row.id !== "string" || typeof row.body !== "string") {
            return
          }

          const messageId = row.id
          const body = row.body
          const pinnedAt =
            typeof row.pinned_at === "string" ? row.pinned_at : null
          const pinnedBy =
            typeof row.pinned_by === "string" ? row.pinned_by : null

          setMessages((current) =>
            current.map((message) =>
              message.id === messageId
                ? { ...message, body, pinned_at: pinnedAt, pinned_by: pinnedBy }
                : message
            )
          )
          setSearchResults((current) =>
            current
              ? current
                  .map((message) =>
                    message.id === messageId
                      ? { ...message, body, pinned_at: pinnedAt, pinned_by: pinnedBy }
                      : message
                  )
                  .filter(
                    (message) =>
                      !activeSearch ||
                      message.body
                        .toLocaleLowerCase()
                        .includes(activeSearch.toLocaleLowerCase())
                  )
              : null
          )
          setPinnedMessages((current) => {
            const existing = current.filter((message) => message.id !== messageId)

            if (!pinnedAt || typeof row.user_id !== "string" ||
                typeof row.organization_id !== "string" ||
                typeof row.created_at !== "string") {
              return existing
            }

            const updatedMessage: TeamChatMessage = {
              ...(row as unknown as Omit<TeamChatMessage, "authorName">),
              body,
              pinned_at: pinnedAt,
              pinned_by: pinnedBy,
              authorName: memberNames.get(row.user_id) ?? "Team member",
            }

            return [updatedMessage, ...existing]
              .sort((first, second) =>
                (second.pinned_at ?? "").localeCompare(first.pinned_at ?? "")
              )
              .slice(0, 10)
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_chat_messages",
        },
        (payload: { old: Record<string, unknown> }) => {
          const messageId = payload.old.id

          if (typeof messageId !== "string") {
            return
          }

          setMessages((current) =>
            current.filter((message) => message.id !== messageId)
          )
          setSearchResults((current) =>
            current ? current.filter((message) => message.id !== messageId) : null
          )
        }
      )
      .subscribe((
        status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED"
      ) => {
        if (status === "SUBSCRIBED") {
          setConnectionState("live")
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionState("reconnecting")
        }
      })

    channelRef.current = channel

    return () => {
      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current)
        stopTypingTimeoutRef.current = null
      }

      if (isTypingRef.current) {
        isTypingRef.current = false
        void channel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: currentUserId, is_typing: false },
        })
      }

      for (const timeout of remoteTypingTimeoutsRef.current.values()) {
        clearTimeout(timeout)
      }
      remoteTypingTimeoutsRef.current.clear()

      if (channelRef.current === channel) {
        channelRef.current = null
      }

      void supabase.removeChannel(channel)
    }
  }, [activeSearch, currentUserId, memberNames, organizationId, supabase])

  useEffect(() => {
    if (activeSearch) {
      return
    }

    const container = messagesContainerRef.current
    const previousPosition = previousScrollPositionRef.current

    if (container && previousPosition) {
      container.scrollTop =
        previousPosition.scrollTop +
        (container.scrollHeight - previousPosition.scrollHeight)
      previousScrollPositionRef.current = null
      return
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages, activeSearch])

  function sendTypingStatus(isTyping: boolean) {
    const channel = channelRef.current

    if (!channel) {
      return
    }

    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: currentUserId, is_typing: isTyping },
    })
  }

  function stopTypingIndicator() {
    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
      stopTypingTimeoutRef.current = null
    }

    if (!isTypingRef.current) {
      return
    }

    isTypingRef.current = false
    sendTypingStatus(false)
  }

  function handleDraftChange(value: string) {
    setDraft(value)

    if (!value.trim()) {
      stopTypingIndicator()
      return
    }

    const now = Date.now()
    if (!isTypingRef.current || now - lastTypingBroadcastAtRef.current >= 1000) {
      isTypingRef.current = true
      lastTypingBroadcastAtRef.current = now
      sendTypingStatus(true)
    }

    if (stopTypingTimeoutRef.current) {
      clearTimeout(stopTypingTimeoutRef.current)
    }

    stopTypingTimeoutRef.current = setTimeout(() => {
      stopTypingIndicator()
    }, 1800)
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchInput.trim()

    if (!query || isSearching) {
      return
    }

    setActiveSearch(query)
    setSearchResults(null)
    setSearchError("")
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = 0
    }

    startSearching(async () => {
      const result = await searchTeamChatMessages(query)

      if (!result.success) {
        setSearchError(result.error)
        return
      }

      const matchingMessages: TeamChatMessage[] = result.messages
        .map((message) => ({
          ...message,
          authorName: memberNames.get(message.user_id) ?? "Team member",
        }))
        .reverse()

      setSearchResults(matchingMessages)
    })
  }

  function handleClearSearch() {
    setSearchInput("")
    setActiveSearch("")
    setSearchResults(null)
    setSearchError("")
  }

  function handleLoadEarlierMessages() {
    const cursor = messages[0]?.created_at

    if (!cursor || isLoadingOlder) {
      return
    }

    setHistoryError("")

    startLoadingOlder(async () => {
      const result = await loadOlderTeamChatMessages(cursor)

      if (!result.success) {
        setHistoryError(result.error)
        return
      }

      const olderMessages: TeamChatMessage[] = result.messages.map(
        (message) => ({
          ...message,
          authorName: memberNames.get(message.user_id) ?? "Team member",
        })
      )

      const container = messagesContainerRef.current
      if (container) {
        previousScrollPositionRef.current = {
          scrollHeight: container.scrollHeight,
          scrollTop: container.scrollTop,
        }
      }

      setMessages((current) => {
        const currentIds = new Set(current.map((message) => message.id))
        const uniqueOlderMessages = olderMessages.filter(
          (message) => !currentIds.has(message.id)
        )

        return [...uniqueOlderMessages, ...current]
      })
      setHasMoreMessages(result.hasMore)
    })
  }

  function handleTogglePinned(message: TeamChatMessage) {
    if (!canPinMessages || isPinningMessage) {
      return
    }

    const shouldPin = !message.pinned_at
    setError("")

    startPinningMessage(async () => {
      const result = await setTeamChatMessagePinned(message.id, shouldPin)

      if (!result.success) {
        setError(result.error)
        return
      }

      const updatedMessage: TeamChatMessage = {
        ...result.message,
        authorName: memberNames.get(result.message.user_id) ?? message.authorName,
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === updatedMessage.id ? updatedMessage : item
        )
      )
      setSearchResults((current) =>
        current
          ? current.map((item) =>
              item.id === updatedMessage.id ? updatedMessage : item
            )
          : null
      )
      setPinnedMessages((current) => {
        const remaining = current.filter((item) => item.id !== updatedMessage.id)

        if (!updatedMessage.pinned_at) {
          return remaining
        }

        return [updatedMessage, ...remaining]
          .sort((first, second) =>
            (second.pinned_at ?? "").localeCompare(first.pinned_at ?? "")
          )
          .slice(0, 10)
      })
    })
  }

  function handleStartReply(message: TeamChatMessage) {
    setError("")
    setEditingMessageId(null)
    setEditDraft("")
    setReplyingTo(message)
  }

  function handleClearReply() {
    setReplyingTo(null)
  }

  function handleStartEdit(message: TeamChatMessage) {
    setError("")
    setReplyingTo(null)
    setEditingMessageId(message.id)
    setEditDraft(message.body)
  }

  function handleCancelEdit() {
    setEditingMessageId(null)
    setEditDraft("")
  }

  function handleSaveEdit(messageId: string) {
    const body = editDraft.trim()

    if (!body || isSavingEdit) {
      if (!body) {
        setError("A message cannot be empty.")
      }
      return
    }

    setError("")

    startSavingEdit(async () => {
      const result = await editTeamChatMessage(messageId, body)

      if (!result.success) {
        setError(result.error)
        return
      }

      const updatedBody = result.message.body
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, body: updatedBody } : message
        )
      )
      setSearchResults((current) =>
        current
          ? current
              .map((message) =>
                message.id === messageId ? { ...message, body: updatedBody } : message
              )
              .filter(
                (message) =>
                  !activeSearch ||
                  message.body
                    .toLocaleLowerCase()
                    .includes(activeSearch.toLocaleLowerCase())
              )
          : null
      )
      setEditingMessageId(null)
      setEditDraft("")
    })
  }

  function handleDeleteMessage(messageId: string) {
    if (
      isDeletingMessage ||
      !window.confirm("Delete this message? This cannot be undone.")
    ) {
      return
    }

    setError("")

    startDeletingMessage(async () => {
      const result = await deleteTeamChatMessage(messageId)

      if (!result.success) {
        setError(result.error)
        return
      }

      setMessages((current) =>
        current.filter((message) => message.id !== result.messageId)
      )
      setSearchResults((current) =>
        current
          ? current.filter((message) => message.id !== result.messageId)
          : null
      )

      if (editingMessageId === result.messageId) {
        setEditingMessageId(null)
        setEditDraft("")
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()

    if (!body || isPending) {
      return
    }

    setError("")

    startTransition(async () => {
      const result = await sendTeamChatMessage(body, replyingTo?.id ?? null)

      if (!result.success) {
        setError(result.error)
        return
      }

      const sentMessage: TeamChatMessage = {
        ...result.message,
        authorName: memberNames.get(result.message.user_id) ?? "You",
      }

      setMessages((current) => {
        if (current.some((message) => message.id === sentMessage.id)) {
          return current
        }

        return [...current, sentMessage].slice(-100)
      })
      stopTypingIndicator()
      setDraft("")
      setReplyingTo(null)
    })
  }

  const visibleTypingNames = typingUserIds
    .map((userId) => memberNames.get(userId))
    .filter((name): name is string => Boolean(name))

  const typingLabel =
    visibleTypingNames.length === 1
      ? `${visibleTypingNames[0]} is typing…`
      : visibleTypingNames.length === 2
        ? `${visibleTypingNames[0]} and ${visibleTypingNames[1]} are typing…`
        : "Several team members are typing…"

  const visibleMessages = activeSearch ? searchResults ?? [] : messages

  const connectionLabel =
    connectionState === "live"
      ? "Live updates on"
      : connectionState === "reconnecting"
        ? "Reconnecting"
        : "Connecting"

  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <MessagesSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[var(--foreground)]">
              Worship team conversation
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Messages are shared with your church workspace.
            </p>
          </div>
        </div>

        <span
          className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)]"
          role="status"
          aria-live="polite"
        >
          {connectionState === "live" ? (
            <Wifi className="size-3.5 text-emerald-600" />
          ) : (
            <WifiOff className="size-3.5" />
          )}
          {connectionLabel}
        </span>
      </div>

      <div className="border-b border-[var(--border)] bg-white px-4 py-3 sm:px-6">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          role="search"
        >
          <div className="relative min-w-0 flex-1">
            <label htmlFor="team-chat-search" className="sr-only">
              Search team chat messages
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              id="team-chat-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              maxLength={120}
              placeholder="Search past team messages…"
              disabled={isSearching}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSearching || !searchInput.trim()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Search className="size-3.5" />
              )}
              <span>{isSearching ? "Searching…" : "Search"}</span>
            </button>
            {activeSearch || searchInput ? (
              <button
                type="button"
                onClick={handleClearSearch}
                disabled={isSearching}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-3.5" />
                Clear
              </button>
            ) : null}
          </div>
        </form>
        {searchError ? (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {searchError}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Search message text across your church workspace. The latest 50 matches can be displayed.
          </p>
        )}
      </div>

      {pinnedMessages.length > 0 ? (
        <section
          aria-label="Pinned team messages"
          className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6"
        >
          <div className="mb-2 flex items-center gap-2">
            <Pin className="size-3.5 text-[var(--brand)]" />
            <h3 className="text-xs font-semibold text-[var(--foreground)]">
              Pinned for the team
            </h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              {pinnedMessages.length}
            </span>
          </div>
          <ul className="max-h-40 space-y-2 overflow-y-auto">
            {pinnedMessages.map((message) => (
              <li
                key={message.id}
                className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[var(--muted)]">
                    {message.authorName} · {formatMessageTime(message.created_at, chatTimeZone)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 text-[var(--foreground)]">
                    {message.body}
                  </p>
                </div>
                {canPinMessages ? (
                  <button
                    type="button"
                    onClick={() => handleTogglePinned(message)}
                    disabled={isPinningMessage}
                    aria-label={`Unpin message from ${message.authorName}`}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <PinOff className="size-3" />
                    Unpin
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        ref={messagesContainerRef}
        className="min-h-[360px] max-h-[62vh] overflow-y-auto bg-[var(--background)]/55 px-4 py-5 sm:min-h-[440px] sm:px-6"
        aria-label="Team chat messages"
        aria-live="polite"
      >
        {!activeSearch && hasMoreMessages && messages.length > 0 ? (
          <div className="mb-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleLoadEarlierMessages}
              disabled={isLoadingOlder}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingOlder ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <ChevronUp className="size-3.5" />
              )}
              {isLoadingOlder ? "Loading earlier messages…" : "Load earlier messages"}
            </button>
            {historyError ? (
              <p role="alert" className="text-center text-xs text-red-700">
                {historyError}
              </p>
            ) : null}
          </div>
        ) : null}

        {activeSearch ? (
          <div className="mb-5 rounded-xl border border-[var(--border)] bg-white px-3.5 py-3">
            <p role="status" aria-live="polite" className="text-xs font-medium text-[var(--muted)]">
              {isSearching
                ? `Searching for “${activeSearch}”…`
                : searchResults
                  ? `${searchResults.length} ${searchResults.length === 1 ? "match" : "matches"} for “${activeSearch}”${searchResults.length === 50 ? " · showing latest 50" : ""}`
                  : `Search results for “${activeSearch}”`}
            </p>
          </div>
        ) : null}

        {activeSearch && isSearching ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-sm text-[var(--muted)]">
            <LoaderCircle className="size-5 animate-spin" />
            Searching messages…
          </div>
        ) : null}

        {activeSearch && !isSearching && searchResults?.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
            <Search className="size-7 text-[var(--muted)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">
              No messages found
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--muted)]">
              Try another keyword or phrase.
            </p>
          </div>
        ) : null}

        {!activeSearch && messages.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center sm:min-h-[400px]">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-white text-[var(--brand)] shadow-sm">
              <MessageCircle className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
              Start the team conversation
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Share a rehearsal update, coordinate a service, or let the worship team know what needs attention.
            </p>
          </div>
        ) : null}

        {!isSearching &&
        ((!activeSearch && messages.length > 0) ||
          (activeSearch && (searchResults?.length ?? 0) > 0)) ? (
          <ol className="space-y-5">
            {visibleMessages.map((message, index) => {
              const previousMessage = visibleMessages[index - 1]
              const showDateSeparator =
                !previousMessage ||
                getMessageDayKey(previousMessage.created_at, chatTimeZone) !==
                  getMessageDayKey(message.created_at, chatTimeZone)
              const isOwnMessage = message.user_id === currentUserId
              const displayName = isOwnMessage ? "You" : message.authorName

              return (
                <Fragment key={message.id}>
                  {showDateSeparator ? (
                    <li
                      aria-label={formatMessageDate(message.created_at, chatTimeZone)}
                      className="flex justify-center py-1"
                    >
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)] shadow-sm">
                        {formatMessageDate(message.created_at, chatTimeZone)}
                      </span>
                    </li>
                  ) : null}
                  <li
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[94%] gap-3 sm:max-w-[82%] ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div className="mt-5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[10px] font-bold text-[var(--brand)]">
                        {isOwnMessage ? initials(members.find((member) => member.id === currentUserId)?.displayName ?? "You") : initials(message.authorName)}
                      </div>
                      <div className={`flex min-w-0 flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                        <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${isOwnMessage ? "justify-end" : ""}`}>
                          <span className="font-semibold text-[var(--foreground)]">
                            {displayName}
                          </span>
                          <time
                            dateTime={message.created_at}
                            className="text-[var(--muted)]"
                          >
                            {formatMessageTime(message.created_at, chatTimeZone)}
                          </time>
                        </div>
                        {message.reply_to_body ? (
                          <div
                            className={`mb-1.5 max-w-full rounded-xl border-l-2 px-3 py-2 text-left text-[11px] ${isOwnMessage ? "border-white/60 bg-white/10 text-white/90" : "border-[var(--brand)]/50 bg-white text-[var(--muted)]"}`}
                          >
                            <p className="font-semibold">
                              Replying to{" "}
                              {message.reply_to_user_id
                                ? memberNames.get(message.reply_to_user_id) ?? "Former team member"
                                : "team member"}
                            </p>
                            <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words">
                              {message.reply_to_body}
                            </p>
                          </div>
                        ) : null}
                        {editingMessageId === message.id ? (
                          <div className="w-full min-w-[240px] rounded-2xl border border-[var(--brand)] bg-white p-3 shadow-sm">
                            <label htmlFor={`edit-team-chat-${message.id}`} className="sr-only">
                              Edit message
                            </label>
                            <textarea
                              id={`edit-team-chat-${message.id}`}
                              value={editDraft}
                              onChange={(event) => setEditDraft(event.target.value)}
                              maxLength={2000}
                              rows={Math.min(5, Math.max(2, editDraft.split("\n").length))}
                              disabled={isSavingEdit}
                              className="max-h-40 min-h-[64px] w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm leading-5 text-[var(--foreground)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isSavingEdit}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-50"
                              >
                                <X className="size-3.5" />
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(message.id)}
                                disabled={isSavingEdit || !editDraft.trim() || editDraft.trim() === message.body}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-2.5 text-xs font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
                              >
                                {isSavingEdit ? (
                                  <LoaderCircle className="size-3.5 animate-spin" />
                                ) : (
                                  <Check className="size-3.5" />
                                )}
                                {isSavingEdit ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm ${isOwnMessage ? "rounded-tr-md bg-[var(--brand)] text-white" : "rounded-tl-md border border-[var(--border)] bg-white text-[var(--foreground)]"}`}
                          >
                            {activeSearch
                              ? highlightSearchTerm(message.body, activeSearch)
                              : message.body}
                          </p>
                        )}
                        {editingMessageId !== message.id ? (
                          <div className={`mt-1.5 flex flex-wrap gap-2 text-[10px] ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                            {canPinMessages ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePinned(message)}
                                disabled={isPinningMessage || isSavingEdit || isDeletingMessage}
                                aria-label={`${message.pinned_at ? "Unpin" : "Pin"} message from ${displayName}`}
                                className={`inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium transition disabled:opacity-50 ${message.pinned_at ? "text-[var(--brand)] hover:bg-white" : "text-[var(--muted)] hover:bg-white hover:text-[var(--foreground)]"}`}
                              >
                                {message.pinned_at ? (
                                  <PinOff className="size-3" />
                                ) : (
                                  <Pin className="size-3" />
                                )}
                                {message.pinned_at ? "Unpin" : "Pin"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleStartReply(message)
                              disabled={isSavingEdit || isDeletingMessage}
                              aria-label={`Reply to ${displayName}'s message sent at ${formatMessageTime(message.created_at, chatTimeZone)}`}
                              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)] disabled:opacity-50"
                            >
                              <Reply className="size-3" />
                              Reply
                            </button>
                            {isOwnMessage ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(message)}
                                  disabled={isSavingEdit || isDeletingMessage}
                                  aria-label={`Edit your message sent at ${formatMessageTime(message.created_at, chatTimeZone)}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)] disabled:opacity-50"
                                >
                                  <Pencil className="size-3" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMessage(message.id)}
                                  disabled={isSavingEdit || isDeletingMessage}
                                  aria-label={`Delete your message sent at ${formatMessageTime(message.created_at, chatTimeZone)}`}
                                  className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                >
                                  {isDeletingMessage ? (
                                    <LoaderCircle className="size-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-3" />
                                  )}
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                </Fragment>
              )
            })}
          </ol>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--border)] bg-white px-4 py-4 sm:px-6">
        {error ? (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {replyingTo ? (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
            <Reply className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--foreground)]">
                Replying to {replyingTo.user_id === currentUserId ? "yourself" : replyingTo.authorName}
              </p>
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-[var(--muted)]">
                {replyingTo.body}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearReply}
              aria-label="Cancel reply"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {visibleTypingNames.length > 0 ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-3 flex items-center gap-2 px-1 text-xs text-[var(--muted)]"
          >
            <span aria-hidden="true" className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-current" />
            </span>
            {typingLabel}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="team-chat-message" className="sr-only">
              Write a message to your worship team
            </label>
            <textarea
              id="team-chat-message"
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                ) {
                  return
                }

                event.preventDefault()

                if (draft.trim() && !isPending) {
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder="Message your worship team…"
              disabled={isPending}
              className="max-h-40 min-h-[52px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
            <span className="hidden sm:inline">
              {isPending ? "Sending" : "Send"}
            </span>
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[var(--muted)]">
          <span>Press Enter to send · Shift+Enter for a new line.</span>
          <span className="shrink-0 tabular-nums">{draft.length}/2000</span>
        </div>
      </div>
    </section>
  )
}
