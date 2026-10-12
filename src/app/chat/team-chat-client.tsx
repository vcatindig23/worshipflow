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
  ChevronUp,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  Wifi,
  X,
  WifiOff,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  loadOlderTeamChatMessages,
  markTeamChatNotificationsRead,
  searchTeamChatMessages,
  sendTeamChatMessage,
} from "./actions"

export type TeamChatMessage = {
  id: string
  organization_id: string
  user_id: string
  body: string
  created_at: string
  authorName: string
}

export type TeamChatMember = {
  id: string
  displayName: string
  role: string
}

type TeamChatClientProps = {
  organizationId: string
  currentUserId: string
  initialMessages: TeamChatMessage[]
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

function formatMessageTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Just now"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function getMessageDayKey(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "unknown-date"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatMessageDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "full",
  }).format(date)
}

function highlightSearchTerm(body: string, query: string): ReactNode {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return body
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")
  const matches = body.split(new RegExp(`(${escapedQuery})`, "gi"))

  return matches.map((part, index) =>
    part.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase() ? (
      <mark
        key={index}
        className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-500/40"
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export default function TeamChatClient({
  organizationId,
  currentUserId,
  initialMessages,
  members,
}: TeamChatClientProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [hasMoreMessages, setHasMoreMessages] = useState(
    initialMessages.length === 100
  )
  const [historyError, setHistoryError] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [activeSearch, setActiveSearch] = useState("")
  const [searchResults, setSearchResults] = useState<TeamChatMessage[] | null>(null)
  const [searchError, setSearchError] = useState("")
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")
  const [isPending, startTransition] = useTransition()
  const [isLoadingOlder, startLoadingOlder] = useTransition()
  const [isSearching, startSearching] = useTransition()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const previousScrollPositionRef = useRef<{
    scrollHeight: number
    scrollTop: number
  } | null>(null)
  const supabase = useMemo(() => createBrowserClient(), [])
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.displayName])),
    [members]
  )

  useEffect(() => {
    void markTeamChatNotificationsRead()
  }, [organizationId])

  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${organizationId}`)
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

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUserId, memberNames, organizationId, supabase])

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()

    if (!body || isPending) {
      return
    }

    setError("")

    startTransition(async () => {
      const result = await sendTeamChatMessage(body)

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
      setDraft("")
    })
  }

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
                getMessageDayKey(previousMessage.created_at) !==
                  getMessageDayKey(message.created_at)
              const isOwnMessage = message.user_id === currentUserId
              const displayName = isOwnMessage ? "You" : message.authorName

              return (
                <Fragment key={message.id}>
                  {showDateSeparator ? (
                    <li
                      aria-label={formatMessageDate(message.created_at)}
                      className="flex justify-center py-1"
                    >
                      <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[10px] font-semibold text-[var(--muted)] shadow-sm">
                        {formatMessageDate(message.created_at)}
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
                            {formatMessageTime(message.created_at)}
                          </time>
                        </div>
                        <p
                          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm ${isOwnMessage ? "rounded-tr-md bg-[var(--brand)] text-white" : "rounded-tl-md border border-[var(--border)] bg-white text-[var(--foreground)]"}`}
                        >
                          {activeSearch
                            ? highlightSearchTerm(message.body, activeSearch)
                            : message.body}
                        </p>
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

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="team-chat-message" className="sr-only">
              Write a message to your worship team
            </label>
            <textarea
              id="team-chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
