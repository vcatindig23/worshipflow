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
