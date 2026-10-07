export function getBoundedStageIndex(
  currentIndex: number,
  offset: number,
  songCount: number
) {
  if (songCount <= 0) {
    return null
  }

  return Math.max(0, Math.min(songCount - 1, currentIndex + offset))
}

export function parseStageSongIndex(value: string) {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const index = Number(value)

  return Number.isSafeInteger(index) && index <= 999
    ? index
    : null
}
