"use client"

import {
  useCallback,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react"
import {
  updateSongPracticeSettings,
  parseSongPracticeSettings,
  type SongPracticeSettings,
  type StoredSongPracticeSettings,
} from "@/lib/song-practice-settings"

const sameTabUpdateEvent = "worshipflow:practice-settings-updated"
const EMPTY_SETTINGS: StoredSongPracticeSettings = Object.freeze({})
const snapshotCache = new Map<
  string,
  { raw: string | null; settings: StoredSongPracticeSettings }
>()

function getStoredSnapshot(storageKey: string | null): StoredSongPracticeSettings {
  if (!storageKey || typeof window === "undefined") return EMPTY_SETTINGS

  let raw: string | null
  try {
    raw = window.localStorage.getItem(storageKey)
  } catch {
    return EMPTY_SETTINGS
  }

  const cached = snapshotCache.get(storageKey)
  if (cached && cached.raw === raw) return cached.settings

  const settings = parseSongPracticeSettings(raw)
  snapshotCache.set(storageKey, { raw, settings })
  return settings
}

function subscribeToStoredSettings(
  storageKey: string | null,
  onStoreChange: () => void
) {
  if (!storageKey || typeof window === "undefined") return () => undefined

  function handleStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== storageKey) return
    onStoreChange()
  }

  function handleSameTabUpdate(event: Event) {
    const detail = (event as CustomEvent<{ key?: string }>).detail
    if (detail?.key === storageKey) onStoreChange()
  }

  window.addEventListener("storage", handleStorage)
  window.addEventListener(sameTabUpdateEvent, handleSameTabUpdate)

  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(sameTabUpdateEvent, handleSameTabUpdate)
  }
}

/**
 * Read from the browser store using React's external-store API. This keeps
 * SSR/hydration on stable defaults, then restores local preferences safely on
 * the client without synchronously setting component state inside effects.
 */
export function useSongPracticePreference<K extends keyof SongPracticeSettings>(
  storageKey: string | null,
  setting: K,
  fallback: SongPracticeSettings[K]
) {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeToStoredSettings(storageKey, onStoreChange),
    [storageKey]
  )
  const getSnapshot = useCallback(
    () => getStoredSnapshot(storageKey),
    [storageKey]
  )
  const getServerSnapshot = useCallback(() => EMPTY_SETTINGS, [])

  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  const [ephemeralValue, setEphemeralValue] =
    useState<SongPracticeSettings[K]>(fallback)

  const storedValue = settings[setting]
  const value = storageKey
    ? (storedValue === undefined ? fallback : storedValue)
    : ephemeralValue

  const setValue = useCallback(
    (action: SetStateAction<SongPracticeSettings[K]>) => {
      const nextValue =
        typeof action === "function"
          ? (action as (previous: SongPracticeSettings[K]) => SongPracticeSettings[K])(value)
          : action

      if (storageKey) {
        updateSongPracticeSettings(storageKey, {
          [setting]: nextValue,
        } as StoredSongPracticeSettings)
      } else {
        setEphemeralValue(nextValue)
      }
    },
    [storageKey, setting, value]
  )

  return [value, setValue] as const
}
