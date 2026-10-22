export type SongLineComparison = {
  lineNumber: number
  current: string
  previous: string
  status: "same" | "changed" | "current-only" | "previous-only"
}

/**
 * Compare chord-and-lyric source line by line. ChordPro markup is intentionally
 * retained so chord changes remain visible alongside lyric changes.
 */
export function compareChordProSources(
  currentSource: string,
  previousSource: string
): SongLineComparison[] {
  const normalize = (source: string) => source.replace(/\r\n?/g, "\n").split("\n")
  const current = normalize(currentSource)
  const previous = normalize(previousSource)
  const length = Math.max(current.length, previous.length)
  const comparisons: SongLineComparison[] = []

  for (let index = 0; index < length; index += 1) {
    const currentLine = current[index]
    const previousLine = previous[index]
    const currentExists = currentLine !== undefined
    const previousExists = previousLine !== undefined

    comparisons.push({
      lineNumber: index + 1,
      current: currentLine ?? "",
      previous: previousLine ?? "",
      status: !previousExists
        ? "current-only"
        : !currentExists
          ? "previous-only"
          : currentLine === previousLine
            ? "same"
            : "changed",
    })
  }

  return comparisons
}
