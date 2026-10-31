import type { ContentLine } from "@/features/chordpro/types"
import type { ChordDiagram } from "@/features/chordpro/chord-diagrams"
import ChordDiagramTooltip from "./chord-diagram-tooltip"

type ChordProLineProps = {
  line: ContentLine
  fontSize: number
  showChords: boolean
  stageMode?: boolean
  customChordShapes?: Record<string, ChordDiagram>
}

export default function ChordProLine({
  line,
  fontSize,
  showChords,
  stageMode = false,
  customChordShapes,
}: ChordProLineProps) {
  const hasChords = line.tokens.some((token) => token.type === "chord")
  const hasLyrics = line.tokens.some(
    (token) => token.type === "text" && token.value.trim() !== ""
  )
  const chordOnly = hasChords && !hasLyrics
  const chordFontSize = Math.max(13, Math.round(fontSize * 0.74))

  // Stage displays keep the selected pixel size at every aspect ratio. The
  // chart container controls wrapping; it must not resize or justify lyric text.
  const stageLyricsFontSize = `${fontSize}px`
  const stageChordFontSize = `${chordFontSize}px`
  const stageChordPadding = `${fontSize * 1.42}px`
  const stageChordOffset = `${fontSize * 0.82}px`

  if (chordOnly) {
    if (!showChords) {
      return null
    }

    return (
      <div
        data-testid={stageMode ? "stage-chord-progression" : undefined}
        className={`mb-4 flex w-full flex-wrap items-baseline justify-center gap-x-8 gap-y-3 font-semibold sm:mb-5 sm:gap-x-10 lg:mb-6 ${
          stageMode ? "text-sky-300" : "text-[var(--brand)]"
        }`}
        style={{
          fontSize: stageMode ? stageChordFontSize : `${chordFontSize}px`,
        }}
      >
        {line.tokens.map((token, tokenIndex) =>
          token.type === "chord" ? (
            <ChordDiagramTooltip
              key={`chord-${tokenIndex}`}
              chord={token.value}
              stageMode={stageMode}
              customShape={customChordShapes?.[token.value]}
            />
          ) : null
        )}
      </div>
    )
  }

  return (
    <div
      data-testid={stageMode ? "stage-lyrics-line" : undefined}
      className={`min-h-[1.8em] whitespace-pre-wrap font-medium leading-[1.9] ${
        stageMode
          ? "relative mx-auto w-fit max-w-full text-center text-white"
          : "relative w-full"
      }`}
      style={{
        fontSize: stageMode ? stageLyricsFontSize : `${fontSize}px`,
        paddingTop: showChords
          ? stageMode
            ? stageChordPadding
            : `${fontSize * 1.42}px`
          : undefined,
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
                bottom: stageMode ? stageChordOffset : `${fontSize * 0.82}px`,
                fontSize: stageMode
                  ? stageChordFontSize
                  : `${chordFontSize}px`,
              }}
            >
              <ChordDiagramTooltip
                chord={token.value}
                stageMode={stageMode}
                customShape={customChordShapes?.[token.value]}
              />
            </span>
          </span>
        )
      })}
    </div>
  )
}
