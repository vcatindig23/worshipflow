"use client"

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import {
  AlertCircle,
  MessageCircle,
  MessagesSquare,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { sendTeamChatMessage } from "./actions"

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

export default function TeamChatClient({
  organizationId,
  currentUserId,
  initialMessages,
  members,
}: TeamChatClientProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting")
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createBrowserClient(), [])
  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.id, member.displayName])),
    [members]
  )

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
        (payload) => {
          const row = payload.new as MessageRow

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
      .subscribe((status) => {
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
  }, [memberNames, organizationId, supabase])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [messages])

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

      <div
        className="min-h-[360px] max-h-[62vh] overflow-y-auto bg-[var(--background)]/55 px-4 py-5 sm:min-h-[440px] sm:px-6"
        aria-label="Team chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
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
        ) : (
          <ol className="space-y-5">
            {messages.map((message) => {
              const isOwnMessage = message.user_id === currentUserId
              const displayName = isOwnMessage ? "You" : message.authorName

              return (
                <li
                  key={message.id}
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
                        {message.body}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
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
          <span>Keep messages focused on worship and service coordination.</span>
          <span className="shrink-0 tabular-nums">{draft.length}/2000</span>
        </div>
      </div>
    </section>
  )
}
