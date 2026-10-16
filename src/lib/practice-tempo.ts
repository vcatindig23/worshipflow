export const MIN_PRACTICE_TEMPO = 40
export const MAX_PRACTICE_TEMPO = 220
export const DEFAULT_PRACTICE_TEMPO = 80

export function clampPracticeTempo(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PRACTICE_TEMPO
  }

  return Math.round(
    Math.min(MAX_PRACTICE_TEMPO, Math.max(MIN_PRACTICE_TEMPO, value))
  )
}

export function estimateTapTempo(timestamps: readonly number[]) {
  if (timestamps.length < 2) return null

  const intervals = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index]!)
    .filter((interval) => Number.isFinite(interval) && interval >= 250 && interval <= 2500)
    .sort((left, right) => left - right)

  if (intervals.length === 0) return null

  const middle = Math.floor(intervals.length / 2)
  const median =
    intervals.length % 2 === 0
      ? (intervals[middle - 1]! + intervals[middle]!) / 2
      : intervals[middle]!

  return clampPracticeTempo(60000 / median)
}
