"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { FormEvent } from "react"
import {
  Download,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  Paperclip,
  Send,
  Smile,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { Feedback } from "@/components/ui/feedback"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  loadTeamChatDirectMessageReactions,
  markTeamChatDirectNotificationsRead,
  loadTeamChatDirectMessages,
  sendTeamChatDirectMessage,
  toggleTeamChatDirectMessageReaction,
} from "./actions"
import type { TeamChatAttachment } from "./team-chat-client"

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🙏", "👏", "🔥", "🎉", "😮"]
const COMPOSER_EMOJIS = [
  "😀", "😃", "😄", "😁", "😊", "🥰", "😍", "😘",
  "😂", "🤣", "🥲", "😉", "😎", "🤔", "😮", "😢",
  "🙏", "👏", "🙌", "👍", "👎", "❤️", "💛", "💚",
  "💙", "💜", "🔥", "🎉", "✨", "💯", "☀️", "🌿",
]

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif"
const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp3,.m4a,.wav,.mp4,.webm"

type DirectConversation = {
  id: string
  otherUserId: string
  otherUserName: string
}

type DirectMessage = {
  id: string
  organization_id: string
  conversation_id: string
  user_id: string
  body: string
  attachments: TeamChatAttachment[]
  created_at: string
  edited_at: string | null
}

type ReactionSummary = {
  emoji: string
  count: number
  userReacted: boolean
}

type Props = {
  currentUserId: string
  conversation: DirectConversation
  onBackToGroup: () => void
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "WF"
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "Just now"
    : new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(date)
}

export default function DirectMessageClient({
  currentUserId,
  conversation,
  onBackToGroup,
}: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({})
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [connectionState, setConnectionState] = useState<"connecting" | "live" | "reconnecting">("connecting")
  const [isPending, startTransition] = useTransition()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<DirectMessage[]>([])
  const supabase = useMemo(() => createBrowserClient(), [])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    void markTeamChatDirectNotificationsRead(conversation.id)
    let cancelled = false
    setLoading(true)
    setError("")
    setMessages([])
    setReactions({})
    void loadTeamChatDirectMessages(conversation.id).then(async (result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        return
      }
      setMessages(result.messages as DirectMessage[])
      const reactionResult = await loadTeamChatDirectMessageReactions(
        conversation.id,
        result.messages.map((message) => message.id)
      )
      if (!cancelled && reactionResult.success) {
        setReactions(reactionResult.reactions)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [conversation.id])

  useEffect(() => {
    const channel = supabase
      .channel(`direct-chat:${conversation.id}`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_chat_direct_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as DirectMessage
          if (!row || typeof row.id !== "string") return
          setMessages((current) => {
            if (current.some((message) => message.id === row.id)) return current
            return [...current, {
              ...row,
              attachments: Array.isArray(row.attachments) ? row.attachments : [],
            }].sort((first, second) =>
              new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
            ).slice(-100)
          })
          requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }))
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_chat_direct_message_reactions",
        },
        () => {
          const ids = messagesRef.current.map((message) => message.id)
          void loadTeamChatDirectMessageReactions(conversation.id, ids).then((result) => {
            if (result.success) setReactions(result.reactions)
          })
        }
      )
      .subscribe((status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED") => {
        if (status === "SUBSCRIBED") setConnectionState("live")
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnectionState("reconnecting")
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversation.id, supabase])

  useEffect(() => {
    const paths = Array.from(new Set(
      messages.flatMap((message) => message.attachments.map((attachment) => attachment.path))
    )).filter((path) => path && !attachmentUrls[path])
    if (paths.length === 0) return

    let cancelled = false
    void Promise.all(paths.map(async (path) => {
      const { data, error: signedUrlError } = await supabase.storage
        .from("team-chat-direct-files")
        .createSignedUrl(path, 60 * 60)
      return { path, url: signedUrlError ? null : data.signedUrl }
    })).then((results) => {
      if (cancelled) return
      setAttachmentUrls((current) => {
        const next = { ...current }
        for (const result of results) if (result.url) next[result.path] = result.url
        return next
      })
    })
    return () => { cancelled = true }
  }, [messages, attachmentUrls, supabase])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
  }, [loading])

  function appendEmoji(emoji: string) {
    const input = messageInputRef.current
    const start = input?.selectionStart ?? draft.length
    const end = input?.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + emoji + draft.slice(end)
    if (next.length > 2000) return
    setDraft(next)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  function acceptFiles(incoming: File[], input: HTMLInputElement) {
    if (selectedFiles.length + incoming.length > 5) {
      setError("You can attach up to 5 files to one message.")
      input.value = ""
      return
    }
    const oversized = incoming.find((file) => file.size > 25 * 1024 * 1024)
    if (oversized) {
      setError(`“${oversized.name}” is larger than 25 MB.`)
      input.value = ""
      return
    }
    setError("")
    setSelectedFiles((current) => [...current, ...incoming])
    input.value = ""
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if ((!draft.trim() && selectedFiles.length === 0) || isPending) return
    setError("")
    const formData = new FormData()
    formData.set("conversationId", conversation.id)
    formData.set("body", draft.trim())
    for (const file of selectedFiles) formData.append("files", file)

    startTransition(async () => {
      const result = await sendTeamChatDirectMessage(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      const message = result.message as DirectMessage
      setMessages((current) => current.some((item) => item.id === message.id)
        ? current
        : [...current, message].slice(-100))
      setDraft("")
      setSelectedFiles([])
      setShowEmojiPicker(false)
      if (imageInputRef.current) imageInputRef.current.value = ""
      if (fileInputRef.current) fileInputRef.current.value = ""
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }))
    })
  }

  function toggleReaction(messageId: string, emoji: string) {
    void toggleTeamChatDirectMessageReaction(conversation.id, messageId, emoji).then((result) => {
      if (!result.success) {
        setError(result.error)
        return
      }
      setReactions((current) => ({ ...current, [messageId]: result.reactions }))
    })
  }

  return (
    <main className="flex min-h-[560px] min-w-0 flex-1 flex-col bg-[var(--card)] md:min-h-0">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onBackToGroup}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] md:hidden"
          aria-label="Back to group chats"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-sm font-bold text-[var(--brand)]">
          {initials(conversation.otherUserName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
            {conversation.otherUserName}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Private conversation · Only you and this member</p>
        </div>
        <span className="wf-status" role="status" aria-live="polite">
          {connectionState === "live" ? <Wifi className="size-3.5 text-[var(--success)]" /> : <WifiOff className="size-3.5" />}
          {connectionState === "live" ? "Live" : connectionState === "reconnecting" ? "Reconnecting" : "Connecting"}
        </span>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto bg-[var(--background)] px-3 py-5 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end">
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <LoaderCircle className="size-4 animate-spin" /> Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto my-auto max-w-sm py-12 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--brand)]">
                <ImageIcon className="size-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">Start a private conversation</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Send a message to {conversation.otherUserName}. This chat is separate from your church group chat.
              </p>
            </div>
          ) : (
            <ol className="space-y-4">
              {messages.map((message) => {
                const own = message.user_id === currentUserId
                const messageReactions = reactions[message.id] ?? []
                return (
                  <li key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[min(86%,620px)] ${own ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`rounded-2xl px-4 py-3 shadow-sm ${own ? "rounded-br-md bg-[var(--brand)] text-white" : "rounded-bl-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"}`}>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                        {message.attachments.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment) => {
                              const url = attachmentUrls[attachment.path]
                              const isImage = attachment.type.startsWith("image/")
                              return isImage && url ? (
                                <a key={attachment.path} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                                  <img src={url} alt={attachment.name} className="max-h-72 w-full rounded-xl object-cover" loading="lazy" />
                                </a>
                              ) : (
                                <a key={attachment.path} href={url ?? "#"} target="_blank" rel="noopener noreferrer" download={attachment.name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${own ? "bg-white/10" : "bg-[var(--surface)]"}`}>
                                  {isImage ? <ImageIcon className="size-5 shrink-0" /> : <FileText className="size-5 shrink-0" />}
                                  <span className="min-w-0 flex-1">
                                    <span className="block break-all text-xs font-semibold">{attachment.name}</span>
                                    <span className="mt-0.5 block text-[10px] opacity-70">{formatSize(attachment.size)}</span>
                                  </span>
                                  <Download className="size-4 shrink-0" />
                                </a>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 px-1 text-[10px] text-[var(--muted)]">
                        {formatTime(message.created_at)}{message.edited_at ? " · edited" : ""}
                      </div>
                      <div className={`mt-1.5 flex flex-wrap gap-1.5 ${own ? "justify-end" : "justify-start"}`}>
                        {messageReactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            type="button"
                            onClick={() => toggleReaction(message.id, reaction.emoji)}
                            aria-label={`${reaction.emoji} reaction, ${reaction.count} total${reaction.userReacted ? ", remove your reaction" : ", add your reaction"}`}
                            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition ${reaction.userReacted ? "border-[var(--brand)]/35 bg-[var(--brand-soft)] text-[var(--foreground)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:bg-[var(--surface)]"}`}
                          >
                            <span>{reaction.emoji}</span><span className="tabular-nums">{reaction.count}</span>
                          </button>
                        ))}
                        <div className="group/reaction relative">
                          <button
                            type="button"
                            aria-label="Add reaction"
                            title="Add reaction"
                            className="inline-flex size-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--brand)]/30 hover:text-[var(--brand)]"
                          >
                            <Smile className="size-3.5" />
                          </button>
                          <div className="absolute bottom-full left-0 z-20 mb-1 hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-xl group-hover/reaction:flex group-focus-within/reaction:flex">
                            <div className="flex gap-1">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button key={emoji} type="button" onClick={() => toggleReaction(message.id, emoji)} aria-label={`React with ${emoji}`} className="flex size-8 items-center justify-center rounded-lg text-base hover:bg-[var(--surface)]">{emoji}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--card)] px-3 py-3 sm:px-6 sm:py-4">
        {error ? <div className="mb-3"><Feedback tone="error" title="Message not sent">{error}</Feedback></div> : null}
        {selectedFiles.length > 0 ? (
          <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[var(--foreground)]">Attachments ({selectedFiles.length}/5)</p>
              <button type="button" onClick={() => setSelectedFiles([])} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]">Remove all</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <span key={`${file.name}-${file.size}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-2 text-xs">
                  {file.type.startsWith("image/") ? <ImageIcon className="size-4 text-[var(--brand)]" /> : <FileText className="size-4 text-[var(--brand)]" />}
                  <span className="max-w-40 truncate">{file.name}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface)]"><X className="size-3.5" /></button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="flex items-end gap-2 sm:gap-3">
          <input ref={imageInputRef} type="file" multiple accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => acceptFiles(Array.from(event.target.files ?? []), event.currentTarget)} />
          <input ref={fileInputRef} type="file" multiple accept={FILE_ACCEPT} className="hidden" onChange={(event) => acceptFiles(Array.from(event.target.files ?? []), event.currentTarget)} />
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Attach images" title="Attach images" className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--brand)]/30 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]">
              <ImageIcon className="size-[18px]" />
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach files" title="Attach files" className="inline-flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--brand)]/30 hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]">
              <Paperclip className="size-[18px]" />
            </button>
          </div>
          <div className="relative min-w-0 flex-1">
            {showEmojiPicker ? (
              <div className="absolute bottom-full right-0 z-30 mb-2 grid w-[min(296px,calc(100vw-48px))] grid-cols-8 gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-xl">
                {COMPOSER_EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => appendEmoji(emoji)} className="flex size-8 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--surface)]" aria-label={`Insert ${emoji}`}>{emoji}</button>
                ))}
              </div>
            ) : null}
            <textarea
              ref={messageInputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && showEmojiPicker) setShowEmojiPicker(false)
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault()
                  if ((draft.trim() || selectedFiles.length > 0) && !isPending) event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder={`Message ${conversation.otherUserName}…`}
              disabled={isPending}
              className="max-h-40 min-h-[48px] w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-5 text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)]/35 focus:ring-2 focus:ring-[var(--brand)]/10 disabled:opacity-60"
            />
          </div>
          <button type="button" onClick={() => setShowEmojiPicker((value) => !value)} aria-label={showEmojiPicker ? "Close emoji picker" : "Choose emoji"} title="Emoji" className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--brand)]">
            <Smile className="size-[18px]" />
          </button>
          <button type="submit" disabled={isPending || (!draft.trim() && selectedFiles.length === 0)} aria-label="Send message" className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-sm transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50">
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[var(--muted)]">
          <span>Separate image and file uploads · Enter to send, Shift+Enter for a new line</span>
          <span className="tabular-nums">{draft.length}/2000</span>
        </div>
      </div>
    </main>
  )
}
