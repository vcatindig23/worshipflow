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
  const chordCount = line.tokens.filter((token) => token.type === "chord").length
  const chordFontSize = Math.max(13, Math.round(fontSize * 0.74))

  // Keep a useful font-size preference as the baseline, while allowing projection
  // layouts to scale naturally with the available width. Mobile stays readable,
  // but does not shrink the lyrics to force an entire song onto one screen.
  const stageLyricsFontSize = `clamp(${Math.round(fontSize * 0.72)}px, ${(
    fontSize * 0.07
  ).toFixed(2)}vw, ${Math.round(fontSize * 1.6)}px)`
  const stageChordFontSize = `clamp(${Math.max(
    18,
    Math.round(fontSize * 0.52)
  )}px, ${(fontSize * 0.052).toFixed(2)}vw, ${Math.round(
    fontSize * 1.12
  )}px)`
  const stageChordPadding = `clamp(${Math.round(
    fontSize * 0.9
  )}px, ${(fontSize * 0.09).toFixed(2)}vw, ${Math.round(
    fontSize * 1.8
  )}px)`
  const stageChordOffset = `clamp(${Math.round(
    fontSize * 0.55
  )}px, ${(fontSize * 0.065).toFixed(2)}vw, ${Math.round(
    fontSize * 1.05
  )}px)`

  if (chordOnly) {
    if (!showChords) {
      return null
    }

    return (
      <div
        className={`mb-4 flex w-full flex-wrap items-baseline justify-center gap-x-4 gap-y-3 font-semibold sm:mb-5 sm:gap-x-6 lg:mb-6 lg:gap-x-8 ${
          stageMode && chordCount > 1 ? "md:justify-evenly lg:justify-between" : ""
        } ${stageMode ? "text-sky-300" : "text-[var(--brand)]"}`}
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
      className={`min-h-[1.8em] w-full whitespace-pre-wrap font-medium leading-[1.9] ${
        stageMode ? "relative text-justify [text-align-last:justify] text-white" : "relative"
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
