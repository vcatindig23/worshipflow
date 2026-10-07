import type { ContentLine } from "@/features/chordpro/types"
import ChordDiagramTooltip from "./chord-diagram-tooltip"

type ChordProLineProps = {
  line: ContentLine
  fontSize: number
  showChords: boolean
  stageMode?: boolean
}

export default function ChordProLine({
  line,
  fontSize,
  showChords,
  stageMode = false,
}: ChordProLineProps) {
  const hasChords = line.tokens.some((token) => token.type === "chord")
  const hasLyrics = line.tokens.some(
    (token) => token.type === "text" && token.value.trim() !== ""
  )
  const chordOnly = hasChords && !hasLyrics
  const chordFontSize = Math.max(12, Math.round(fontSize * 0.65))

  if (chordOnly) {
    if (!showChords) {
      return null
    }

    return (
      <div
        className={`mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-semibold ${
          stageMode ? "text-sky-300" : "text-[var(--brand)]"
        }`}
        style={{ fontSize: `${chordFontSize}px` }}
      >
        {line.tokens.map((token, tokenIndex) =>
          token.type === "chord" ? (
            <ChordDiagramTooltip
              key={`chord-${tokenIndex}`}
              chord={token.value}
              stageMode={stageMode}
            />
          ) : null
        )}
      </div>
    )
  }

  return (
    <div
      className={`min-h-[1.8em] whitespace-pre-wrap font-medium leading-[1.9] ${
        stageMode ? "relative text-white" : "relative"
      }`}
      style={{
        fontSize: `${fontSize}px`,
        paddingTop: showChords ? `${fontSize * 1.35}px` : undefined,
      }}
    >
      {line.tokens.map((token, tokenIndex) => {
        if (token.type === "text") {
          return <span key={`text-${tokenIndex}`}>{token.value}</span>
        }

        if (!showChords) {
          return null
        }

        return (
          <span
            key={`chord-${tokenIndex}`}
            className="relative inline-block h-0 w-0 align-baseline"
          >
            <span
              className={`absolute left-0 whitespace-nowrap font-semibold leading-none ${
                stageMode ? "text-sky-300" : "text-[var(--brand)]"
              }`}
              style={{
                bottom: `${fontSize * 0.65}px`,
                fontSize: `${chordFontSize}px`,
              }}
            >
              <ChordDiagramTooltip
                chord={token.value}
                stageMode={stageMode}
              />
            </span>
          </span>
        )
      })}
    </div>
  )
}
