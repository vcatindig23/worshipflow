"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import Link from "next/link"
import type { FormEvent, ReactNode } from "react"
import { Fragment } from "react"
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Copy,
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
  UsersRound,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  deleteTeamChatMessage,
  editTeamChatMessage,
  loadOlderTeamChatMessages,
  markTeamChatNotificationsRead,
  searchTeamChatMessages,
  sendTeamChatMessageWithAttachments,
  setTeamChatMessagePinned,
} from "./actions"

function currentTimeMs() {
  return Date.now()
}

export type TeamChatAttachment = {
  path: string
  name: string
  type: string
  size: number
}

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
  mentioned_user_ids: string[]
  attachments: TeamChatAttachment[]
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function linkifyMessageBody(body: string): ReactNode {
  const urlPattern = /https?:\/\/[^\s<]+/gi
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of body.matchAll(urlPattern)) {
    const rawUrl = match[0]
    const start = match.index ?? 0
    const trimmedUrl = rawUrl.replace(/[),.!?;:]+$/, "")
    if (start > cursor) parts.push(body.slice(cursor, start))
    let safeUrl = ""
    try {
      const parsed = new URL(trimmedUrl)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") safeUrl = parsed.toString()
    } catch {
      safeUrl = ""
    }
    if (safeUrl) {
      parts.push(<a key={start} href={safeUrl} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2 hover:opacity-80">{trimmedUrl}</a>)
      if (trimmedUrl.length < rawUrl.length) parts.push(rawUrl.slice(trimmedUrl.length))
    } else {
      parts.push(rawUrl)
    }
    cursor = start + rawUrl.length
  }
  if (cursor < body.length) parts.push(body.slice(cursor))
  return parts.length ? parts : body
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


function highlightMentionedUsers(
  body: string,
  mentionedUserIds: string[],
  members: TeamChatMember[]
): ReactNode {
  const mentionedNames = Array.from(
    new Set(
      mentionedUserIds
        .map((userId) => members.find((member) => member.id === userId)?.displayName)
        .filter((name): name is string => Boolean(name))
    )
  ).sort((first, second) => second.length - first.length)

  if (mentionedNames.length === 0) {
    return body
  }

  const normalizedBody = body.toLocaleLowerCase()
  const ranges: { start: number; end: number; text: string; key: string }[] = []

  for (const name of mentionedNames) {
    const needle = `@${name}`.toLocaleLowerCase()
    let cursor = 0
    let start = normalizedBody.indexOf(needle, cursor)

    while (start !== -1) {
      const previousCharacter = start > 0 ? body[start - 1] : ""
      if (!previousCharacter || !/[A-Za-z0-9_]/.test(previousCharacter)) {
        ranges.push({
          start,
          end: start + needle.length,
          text: body.slice(start, start + needle.length),
          key: `${start}-${name}`,
        })
      }
      cursor = start + needle.length
      start = normalizedBody.indexOf(needle, cursor)
    }
  }

  ranges.sort((first, second) => first.start - second.start || second.end - first.end)

  const visibleRanges: typeof ranges = []
  let consumedUntil = -1
  for (const range of ranges) {
    if (range.start < consumedUntil) {
      continue
    }
    visibleRanges.push(range)
    consumedUntil = range.end
  }

  if (visibleRanges.length === 0) {
    return body
  }

  const parts: ReactNode[] = []
  let cursor = 0

  for (const range of visibleRanges) {
    if (range.start > cursor) {
      parts.push(body.slice(cursor, range.start))
    }

    parts.push(
      <span
        key={range.key}
        className="font-semibold underline decoration-dotted underline-offset-2"
      >
        {range.text}
      </span>
    )
    cursor = range.end
  }

  if (cursor < body.length) {
    parts.push(body.slice(cursor))
  }

  return parts
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [newMessageCount, setNewMessageCount] = useState(0)
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")
  const [isPending, startTransition] = useTransition()
  const [isSavingEdit, startSavingEdit] = useTransition()
  const [isDeletingMessage, startDeletingMessage] = useTransition()
  const [isLoadingOlder, startLoadingOlder] = useTransition()
  const [isSearching, startSearching] = useTransition()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const forceScrollToBottomRef = useRef(false)
  const knownMessageIdsRef = useRef(new Set(initialMessages.map((message) => message.id)))
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
    const paths = Array.from(new Set(
      messages.flatMap((message) =>
        (message.attachments ?? []).map((attachment) => attachment.path)
      )
    )).filter((path) => path && !attachmentUrls[path])

    if (paths.length === 0) return

    let cancelled = false
    void Promise.all(paths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from("team-chat-files")
        .createSignedUrl(path, 60 * 60)
      return { path, url: error ? null : data.signedUrl }
    })).then((results) => {
      if (cancelled) return
      setAttachmentUrls((current) => {
        const next = { ...current }
        for (const result of results) {
          if (result.url) next[result.path] = result.url
        }
        return next
      })
    })

    return () => { cancelled = true }
  }, [messages, attachmentUrls, supabase])

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
            mentioned_user_ids: Array.isArray(row.mentioned_user_ids)
              ? row.mentioned_user_ids
              : [],
            authorName: memberNames.get(row.user_id) ?? "Team member",
          }

          if (knownMessageIdsRef.current.has(incomingMessage.id)) {
            return
          }
          knownMessageIdsRef.current.add(incomingMessage.id)

          const container = messagesContainerRef.current
          const distanceFromBottom = container
            ? container.scrollHeight - container.scrollTop - container.clientHeight
            : 0
          const isNearBottom = !container || distanceFromBottom <= 96

          if (row.user_id === currentUserId) {
            forceScrollToBottomRef.current = true
            setNewMessageCount(0)
          } else if (isNearBottom) {
            forceScrollToBottomRef.current = true
            setNewMessageCount(0)
            void markTeamChatNotificationsRead()
          } else {
            setNewMessageCount((count) => count + 1)
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
          const mentionedUserIds = Array.isArray(row.mentioned_user_ids)
            ? row.mentioned_user_ids.filter(
                (userId): userId is string => typeof userId === "string"
              )
            : undefined

          setMessages((current) =>
            current.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    body,
                    pinned_at: pinnedAt,
                    pinned_by: pinnedBy,
                    ...(mentionedUserIds ? { mentioned_user_ids: mentionedUserIds } : {}),
                  }
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
      forceScrollToBottomRef.current = false
      return
    }

    const distanceFromBottom = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight
      : 0
    const shouldFollowLatest =
      forceScrollToBottomRef.current || !container || distanceFromBottom <= 96

    if (shouldFollowLatest) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      })
      setNewMessageCount(0)
    }

    forceScrollToBottomRef.current = false
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

  function handleDraftChange(value: string, cursor = value.length) {
    setDraft(value)

    setMentionedUserIds(
      mentionedUserIds.filter((userId) => {
        const name = memberNames.get(userId)
        return Boolean(name && value.includes(`@${name}`))
      })
    )

    const textBeforeCursor = value.slice(0, cursor)
    const mentionMatch = textBeforeCursor.match(/(?:^|\\s)@([^\\s@]{0,40})$/)
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1])
      setMentionStartIndex(textBeforeCursor.lastIndexOf("@"))
    } else {
      setMentionQuery(null)
      setMentionStartIndex(null)
    }

    if (!value.trim()) {
      stopTypingIndicator()
      return
    }

    const now = currentTimeMs()
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

  function handleSelectMention(member: TeamChatMember) {
    if (mentionStartIndex === null) {
      return
    }

    const cursor = messageInputRef.current?.selectionStart ?? draft.length
    const nextBody =
      draft.slice(0, mentionStartIndex) +
      `@${member.displayName} ` +
      draft.slice(cursor)
    const nextCursor = mentionStartIndex + member.displayName.length + 2

    if (nextBody.length > 2000) {
      setError("That mention would exceed the 2,000-character message limit.")
      setMentionQuery(null)
      setMentionStartIndex(null)
      return
    }

    handleDraftChange(nextBody, nextCursor)
    setMentionedUserIds((current) => {
      const stillPresent = current.filter((userId) => {
        const name = memberNames.get(userId)
        return Boolean(name && nextBody.includes(`@${name}`))
      })
      return stillPresent.includes(member.id)
        ? stillPresent
        : [...stillPresent, member.id].slice(0, 10)
    })
    setMentionQuery(null)
    setMentionStartIndex(null)

    requestAnimationFrame(() => {
      const input = messageInputRef.current
      if (!input) {
        return
      }
      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
    })
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
      for (const message of olderMessages) {
        knownMessageIdsRef.current.add(message.id)
      }

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

  async function handleCopyMessage(message: TeamChatMessage) {
    try {
      await navigator.clipboard.writeText(message.body)
      setCopiedMessageId(message.id)
      window.setTimeout(() => {
        setCopiedMessageId((current) => current === message.id ? null : current)
      }, 1800)
    } catch {
      setError("This browser could not copy the message. Please select and copy it manually.")
    }
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

      knownMessageIdsRef.current.delete(result.messageId)
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

  function handleMessagesScroll() {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    if (distanceFromBottom <= 96) {
      setNewMessageCount(0)
    }
  }

  function handleJumpToLatest() {
    setNewMessageCount(0)
    forceScrollToBottomRef.current = true
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    forceScrollToBottomRef.current = false
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()

    if ((!body && selectedFiles.length === 0) || isPending) {
      return
    }

    setError("")
    const formData = new FormData()
    formData.set("body", body)
    formData.set("replyToMessageId", replyingTo?.id ?? "")
    formData.set("mentionedUserIds", JSON.stringify(mentionedUserIds))
    for (const file of selectedFiles) formData.append("files", file)

    startTransition(async () => {
      const result = await sendTeamChatMessageWithAttachments(formData)

      if (!result.success) {
        setError(result.error)
        return
      }

      const sentMessage: TeamChatMessage = {
        ...result.message,
        authorName: memberNames.get(result.message.user_id) ?? "You",
      }

      const messageAlreadyReceived = knownMessageIdsRef.current.has(sentMessage.id)
      knownMessageIdsRef.current.add(sentMessage.id)

      if (!messageAlreadyReceived) {
        forceScrollToBottomRef.current = true
        setNewMessageCount(0)
        setMessages((current) => {
          if (current.some((message) => message.id === sentMessage.id)) {
            return current
          }

          return [...current, sentMessage].slice(-100)
        })
      }
      stopTypingIndicator()
      setDraft("")
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ""
      setMentionedUserIds([])
      setMentionQuery(null)
      setMentionStartIndex(null)
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
  const mentionSuggestions =
    mentionQuery === null
      ? []
      : members
          .filter((member) => member.id !== currentUserId)
          .filter((member) =>
            member.displayName.toLocaleLowerCase().includes(mentionQuery.toLocaleLowerCase())
          )
          .slice(0, 6)

  const connectionLabel =
    connectionState === "live"
      ? "Live updates on"
      : connectionState === "reconnecting"
        ? "Reconnecting"
        : "Connecting"

  const latestMessage = messages[messages.length - 1]
  const latestMessagePreview = latestMessage
    ? latestMessage.body.trim() || (latestMessage.attachments.length > 0 ? "Shared an attachment" : "Message")
    : "Start the team conversation"

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-white shadow-[0_24px_64px_-44px_rgba(21,35,27,0.45)]">
      <div className="flex min-h-0 flex-col md:h-[min(78vh,860px)] md:min-h-[620px] md:flex-row">
        <aside className="flex max-h-[190px] shrink-0 flex-col overflow-hidden border-b border-[var(--border)] bg-[#fbfcfd] md:max-h-none md:w-[286px] md:border-b-0 md:border-r">
          <div className="px-4 pb-4 pt-5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[var(--brand)]">WorshipFlow</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Chats</h2>
              </div>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-sm">
                <MessagesSquare className="size-[18px]" />
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">Your church team&apos;s shared space.</p>
          </div>

          <div className="px-2.5 sm:px-3">
            <div aria-current="page" className="flex items-center gap-3 rounded-2xl border border-[var(--brand)]/10 bg-[var(--brand-soft)] p-3 shadow-sm">
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white">
                <MessagesSquare className="size-5" />
                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-[var(--brand-soft)] bg-white text-[8px] font-bold text-[var(--brand)]">
                  {members.length > 9 ? "9+" : members.length}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--foreground)]">Worship team</span>
                  <span className={`size-2 shrink-0 rounded-full ${connectionState === "live" ? "bg-emerald-500" : "bg-amber-500"}`} aria-label={connectionLabel} />
                </span>
                <span className="mt-1 block truncate text-xs leading-5 text-[var(--muted)]">{latestMessagePreview}</span>
                <span className="mt-0.5 block text-[10px] text-[var(--muted)]">{members.length} members · Shared chat</span>
              </span>
            </div>
          </div>

          <div className="mt-5 hidden min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:block">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--muted)]">People</h3>
              <span className="rounded-full bg-[#eef0f3] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">{members.length}</span>
            </div>
            <ul className="mt-3 space-y-1">
              {members.map((member) => (
                <li key={member.id} className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[10px] font-bold text-[var(--brand)] shadow-sm">
                    {initials(member.displayName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-[var(--foreground)]">
                      {member.id === currentUserId ? `${member.displayName} (You)` : member.displayName}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-[var(--muted)]">{member.role.replaceAll("_", " ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto hidden border-t border-[var(--border)] px-5 py-3 md:block">
            <p className="text-[10px] leading-5 text-[var(--muted)]">Messages are visible to members of your current church workspace.</p>
          </div>
        </aside>

        <main className="flex min-h-[560px] min-w-0 flex-1 flex-col bg-white md:min-h-0">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--brand)]/10 bg-[var(--brand-soft)] text-[var(--brand)] shadow-sm">
            <MessagesSquare className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
              Team conversation
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Share updates, coordinate rehearsals, and keep everyone in sync.
            </p>
          </div>
        </div>

        <span
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] shadow-sm"
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
                    <Link
                      href={message.user_id === currentUserId ? "/profile" : "/profile/" + message.user_id}
                      className="underline-offset-2 hover:text-[var(--brand)] hover:underline"
                    >
                      {message.authorName}
                    </Link>
                    {" · "}
                    {formatMessageTime(message.created_at, chatTimeZone)}
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

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={messagesContainerRef}
          className="h-[min(62vh,680px)] min-h-[320px] overflow-y-auto overscroll-contain bg-[#f7f8fa] px-4 py-5 sm:px-6 md:h-auto md:min-h-0 md:flex-1"
          onScroll={handleMessagesScroll}
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
                      <Link
                        href={message.user_id === currentUserId ? "/profile" : "/profile/" + message.user_id}
                        aria-label={"View " + displayName + "'s profile"}
                        className="mt-5 flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[10px] font-bold text-[var(--brand)] transition hover:ring-2 hover:ring-[var(--brand)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                      >
                        {isOwnMessage ? initials(members.find((member) => member.id === currentUserId)?.displayName ?? "You") : initials(message.authorName)}
                      </Link>
                      <div className={`flex min-w-0 flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                        <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${isOwnMessage ? "justify-end" : ""}`}>
                          <Link
                            href={message.user_id === currentUserId ? "/profile" : "/profile/" + message.user_id}
                            className="font-semibold text-[var(--foreground)] underline-offset-2 hover:text-[var(--brand)] hover:underline"
                          >
                            {displayName}
                          </Link>
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
                            className={`max-w-full whitespace-pre-wrap break-words rounded-[22px] px-4 py-2.5 text-left text-sm leading-[1.55] shadow-sm ${isOwnMessage ? "rounded-br-md bg-[var(--brand)] text-white shadow-[0_3px_8px_-6px_rgba(21,35,27,0.8)]" : "rounded-bl-md border border-[#e6e9ed] bg-[#eef0f3] text-[#20242a] shadow-none"}`}
                          >
                            {activeSearch
                              ? highlightSearchTerm(message.body, activeSearch)
                              : message.body.match(/https?:\/\//i)
                                ? linkifyMessageBody(message.body)
                                : highlightMentionedUsers(
                                    message.body,
                                    message.mentioned_user_ids ?? [],
                                    members
                                  )}
                          </p>
                        )}
                        {message.attachments?.length ? (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((attachment) => {
                              const url = attachmentUrls[attachment.path]
                              const isImage = attachment.type.startsWith("image/")
                              return (
                                <div key={attachment.path} className={`overflow-hidden rounded-xl border ${isOwnMessage ? "border-white/20 bg-white/10" : "border-[var(--border)] bg-[var(--background)]"}`}>
                                  {isImage && url ? (
                                    <a href={url} target="_blank" rel="noreferrer" className="block">
                                      <img src={url} alt={attachment.name} className="max-h-72 w-full object-contain" loading="lazy" />
                                    </a>
                                  ) : null}
                                  <a href={url ?? "#"} target="_blank" rel="noreferrer" download={attachment.name} onClick={(event) => { if (!url) event.preventDefault() }} className="flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80">
                                    {isImage ? <ImageIcon className="size-5 shrink-0" /> : <FileText className="size-5 shrink-0" />}
                                    <span className="min-w-0 flex-1">
                                      <span className="block break-all text-xs font-semibold">{attachment.name}</span>
                                      <span className="mt-0.5 block text-[10px] opacity-70">{formatFileSize(attachment.size)}</span>
                                    </span>
                                    <Download className="size-4 shrink-0" />
                                  </a>
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
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
                              onClick={() => void handleCopyMessage(message)}
                              aria-label={copiedMessageId === message.id ? "Message copied" : "Copy message text"}
                              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="size-3" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                              {copiedMessageId === message.id ? "Copied" : "Copy"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartReply(message)}
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
        {newMessageCount > 0 && !activeSearch ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
            <button
              type="button"
              onClick={handleJumpToLatest}
              className="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-[var(--brand)] px-4 text-xs font-semibold text-white shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              <ChevronDown className="size-4" />
              {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"}
              <span className="ml-1 border-l border-white/30 pl-2">Jump to latest</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[var(--border)] bg-gradient-to-r from-white to-[var(--surface)]/35 px-3 py-3 sm:px-6 sm:py-4">
        {error ? (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {selectedFiles.length > 0 ? (
          <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">Attachments ({selectedFiles.length}/5)</p>
              <button type="button" onClick={() => setSelectedFiles([])} className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]">Remove all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <span key={`${file.name}-${file.size}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 text-xs">
                  {file.type.startsWith("image/") ? <ImageIcon className="size-4 shrink-0 text-[var(--brand)]" /> : <FileText className="size-4 shrink-0 text-[var(--brand)]" />}
                  <span className="max-w-48 truncate">{file.name}</span>
                  <span className="shrink-0 text-[var(--muted)]">{formatFileSize(file.size)}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"><X className="size-3.5" /></button>
                </span>
              ))}
            </div>
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

        <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,video/mp4,video/webm"
            className="hidden"
            onChange={(event) => {
              const incoming = Array.from(event.target.files ?? [])
              if (selectedFiles.length + incoming.length > 5) {
                setError("You can attach up to 5 files to one message.")
                event.target.value = ""
                return
              }
              const oversized = incoming.find((file) => file.size > 25 * 1024 * 1024)
              if (oversized) {
                setError(`“${oversized.name}” is larger than 25 MB.`)
                event.target.value = ""
                return
              }
              setError("")
              setSelectedFiles((current) => [...current, ...incoming])
              event.target.value = ""
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach files or images" title="Attach files or images" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eef0f3] text-[var(--foreground)] transition hover:bg-[#e2e5e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25">
            <Paperclip className="size-5" />
          </button>
          <div className="relative min-w-0 flex-1">
            {mentionQuery !== null ? (
              <div
                id="team-chat-mention-options"
                role="listbox"
                aria-label="Mention a team member"
                className="absolute bottom-full z-20 mb-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-xl"
              >
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Mention a teammate
                </p>
                {mentionSuggestions.length > 0 ? (
                  mentionSuggestions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectMention(member)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface)] focus:bg-[var(--surface)] focus:outline-none"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[10px] font-bold text-[var(--brand)]">
                        {initials(member.displayName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                          {member.displayName}
                        </span>
                        <span className="mt-0.5 block text-[10px] capitalize text-[var(--muted)]">
                          {member.role.replaceAll("_", " ")}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-xs text-[var(--muted)]">
                    No matching teammates.
                  </p>
                )}
              </div>
            ) : null}
            <label htmlFor="team-chat-message" className="sr-only">
              Write a message to your worship team
            </label>
            <textarea
              ref={messageInputRef}
              id="team-chat-message"
              value={draft}
              onChange={(event) => handleDraftChange(
                event.target.value,
                event.target.selectionStart
              )}
              aria-autocomplete="list"
              aria-controls={mentionQuery !== null ? "team-chat-mention-options" : undefined}
              aria-expanded={mentionQuery !== null && mentionSuggestions.length > 0}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  mentionQuery !== null &&
                  mentionSuggestions.length > 0
                ) {
                  event.preventDefault()
                  handleSelectMention(mentionSuggestions[0])
                  return
                }

                if (event.key === "Escape" && mentionQuery !== null) {
                  event.preventDefault()
                  setMentionQuery(null)
                  setMentionStartIndex(null)
                  return
                }

                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                ) {
                  return
                }

                event.preventDefault()

                if ((draft.trim() || selectedFiles.length > 0) && !isPending) {
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder="Message your worship team…"
              disabled={isPending}
              className="max-h-40 min-h-[48px] w-full resize-y rounded-[24px] border border-transparent bg-[#f0f2f5] px-4 py-3 text-sm leading-5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)]/25 focus:bg-white focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || (!draft.trim() && selectedFiles.length === 0)}
            aria-label={isPending ? "Sending message" : "Send message"}
            title={isPending ? "Sending message" : "Send message"}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] p-0 text-white shadow-sm transition hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
            <span className="sr-only">{isPending ? "Sending" : "Send message"}</span>
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[var(--muted)]">
          <span className="min-w-0 leading-4">Attach up to 5 files · Enter to send, Shift+Enter for a new line</span>
          <span className="shrink-0 tabular-nums">{draft.length}/2000</span>
        </div>
      </div>
        </main>
      </div>
    </section>
  )
}
