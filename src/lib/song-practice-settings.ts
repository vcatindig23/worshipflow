export const PRACTICE_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export type PracticePlaybackRate = (typeof PRACTICE_PLAYBACK_RATES)[number]

export type SongPracticeSettings = {
  tempo: number
  countInEnabled: boolean
  playbackRate: PracticePlaybackRate
  fontSize: number
  showChords: boolean
  transposeAmount: number
  capo: number
  scrollSpeed: number
}

export type StoredSongPracticeSettings = Partial<SongPracticeSettings>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
}

/**
 * Keep practice preferences private to this musician, workspace, and song.
 * These settings stay in the current browser/device and are not shared with
 * other members or written back to the shared song record.
 */
export function getSongPracticeSettingsStorageKey(
  organizationId: string | undefined,
  userId: string | undefined,
  songId: string | undefined
): string | null {
  if (!organizationId || !userId || !songId) return null

  return [
    "worshipflow",
    "practice-settings",
    "v1",
    organizationId,
    userId,
    songId,
  ].join(":")
}

/** Parse and validate browser-stored settings before applying them to controls. */
export function parseSongPracticeSettings(
  raw: string | null
): StoredSongPracticeSettings {
  if (!raw) return {}

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return {}
  }

  if (!isRecord(value)) return {}

  const settings: StoredSongPracticeSettings = {}

  if (isIntegerInRange(value.tempo, 40, 220)) {
    settings.tempo = value.tempo
  }
  if (typeof value.countInEnabled === "boolean") {
    settings.countInEnabled = value.countInEnabled
  }
  if (
    typeof value.playbackRate === "number" &&
    PRACTICE_PLAYBACK_RATES.some((rate) => rate === value.playbackRate)
  ) {
    settings.playbackRate = value.playbackRate as PracticePlaybackRate
  }
  if (isIntegerInRange(value.fontSize, 14, 40)) {
    settings.fontSize = value.fontSize
  }
  if (typeof value.showChords === "boolean") {
    settings.showChords = value.showChords
  }
  if (isIntegerInRange(value.transposeAmount, -12, 12)) {
    settings.transposeAmount = value.transposeAmount
  }
  if (isIntegerInRange(value.capo, 0, 12)) {
    settings.capo = value.capo
  }
  if (isIntegerInRange(value.scrollSpeed, 1, 3)) {
    settings.scrollSpeed = value.scrollSpeed
  }

  return settings
}

export function readSongPracticeSettings(
  storageKey: string | null
): StoredSongPracticeSettings {
  if (!storageKey || typeof window === "undefined") return {}

  try {
    return parseSongPracticeSettings(window.localStorage.getItem(storageKey))
  } catch {
    return {}
  }
}

/** Merge a single component's setting without overwriting other saved controls. */
export function updateSongPracticeSettings(
  storageKey: string | null,
  update: StoredSongPracticeSettings
): boolean {
  if (!storageKey || typeof window === "undefined") return false

  try {
    const current = readSongPracticeSettings(storageKey)
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ ...current, ...update })
    )
    window.dispatchEvent(
      new CustomEvent("worshipflow:practice-settings-updated", {
        detail: { key: storageKey },
      })
    )
    return true
  } catch {
    // Let the control use an in-memory fallback if browser storage is blocked.
    return false
  }
}
