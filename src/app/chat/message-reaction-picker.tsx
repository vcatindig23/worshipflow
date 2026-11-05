"use client"

type MessageReactionPickerProps = {
  isOwnMessage: boolean
  hasAvatar?: boolean
  isOpen: boolean
  onSelect: (emoji: string) => void
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🙏", "👏", "🔥", "🎉", "😮"]

export function MessageReactionPicker({
  isOwnMessage,
  hasAvatar = false,
  isOpen,
  onSelect,
}: MessageReactionPickerProps) {
  return (
    <div
      className={`absolute bottom-full ${isOwnMessage ? "right-0" : "left-0"} z-20 mb-1 w-max ${hasAvatar ? "max-w-[calc(100vw-5rem)]" : "max-w-[calc(100vw-2rem)]"} rounded-xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-xl ${isOpen ? "flex" : "hidden"}`}
    >
      <div className={`flex max-w-full flex-wrap gap-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            aria-label={`React with ${emoji}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base transition hover:bg-[var(--surface)]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
