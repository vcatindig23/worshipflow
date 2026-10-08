import type { LiveStageSong } from "./live-stage"

export const OFFLINE_STAGE_DATABASE = "worshipflow-offline-stage"
export const OFFLINE_STAGE_STORE = "setlists"
export const MAX_OFFLINE_STAGE_BYTES = 10 * 1024 * 1024

export type OfflineStageSnapshot = {
  setlistId: string
  setlistName: string
  userId: string
  storageKey: string
  songs: LiveStageSong[]
  savedAt: string
}

export function isOfflineStageSnapshot(
  value: unknown
): value is OfflineStageSnapshot {
  if (!value || typeof value !== "object") {
    return false
  }

  const snapshot = value as Partial<OfflineStageSnapshot>

  return (
    typeof snapshot.setlistId === "string" &&
    typeof snapshot.setlistName === "string" &&
    typeof snapshot.userId === "string" &&
    typeof snapshot.storageKey === "string" &&
    typeof snapshot.savedAt === "string" &&
    Array.isArray(snapshot.songs) &&
    snapshot.songs.every(
      (song) =>
        song !== null &&
        typeof song === "object" &&
        typeof song.id === "string" &&
        typeof song.title === "string" &&
        typeof song.source === "string" &&
        typeof song.section === "string" &&
        typeof song.position === "number"
    )
  )
}

function openOfflineStageDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Offline storage is not available."))
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_STAGE_DATABASE, 1)

    request.onupgradeneeded = () => {
      const database = request.result

      if (database.objectStoreNames.contains(OFFLINE_STAGE_STORE)) {
        database.deleteObjectStore(OFFLINE_STAGE_STORE)
      }

      if (!database.objectStoreNames.contains(OFFLINE_STAGE_STORE)) {
        database.createObjectStore(OFFLINE_STAGE_STORE, {
          keyPath: "storageKey",
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open offline storage."))
  })
}

export async function saveOfflineStageSnapshot(
  snapshot: OfflineStageSnapshot
) {
  const snapshotBytes = new TextEncoder().encode(
    JSON.stringify(snapshot)
  ).byteLength

  if (snapshotBytes > MAX_OFFLINE_STAGE_BYTES) {
    throw new Error(
      "This service is too large to save for offline use (10 MB maximum)."
    )
  }

  const database = await openOfflineStageDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        OFFLINE_STAGE_STORE,
        "readwrite"
      )

      transaction.objectStore(OFFLINE_STAGE_STORE).put(snapshot)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(
          transaction.error ?? new Error("Unable to save offline service.")
        )
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error("Offline service save was aborted.")
        )
    })
  } finally {
    database.close()
  }
}

export async function loadOfflineStageSnapshot(
  userId: string,
  setlistId: string
) {
  const database = await openOfflineStageDatabase()

  try {
    const snapshot = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(
        OFFLINE_STAGE_STORE,
        "readonly"
      )
      const request = transaction
        .objectStore(OFFLINE_STAGE_STORE)
        .get(`${userId}:${setlistId}`)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error("Unable to load offline service."))
    })

    if (!isOfflineStageSnapshot(snapshot)) {
      return null
    }

    return snapshot.userId === userId &&
      snapshot.setlistId === setlistId
      ? snapshot
      : null
  } finally {
    database.close()
  }
}

export async function clearOfflineStageSnapshots(keepUserId?: string) {
  if (typeof indexedDB === "undefined") {
    return
  }

  const database = await openOfflineStageDatabase()

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        OFFLINE_STAGE_STORE,
        "readwrite"
      )
      const store = transaction.objectStore(OFFLINE_STAGE_STORE)
      if (!keepUserId) {
        store.clear()
      } else {
        const request = store.openCursor()
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) {
            return
          }
          if (
            !isOfflineStageSnapshot(cursor.value) ||
            cursor.value.userId !== keepUserId
          ) {
            cursor.delete()
          }
          cursor.continue()
        }
        request.onerror = () =>
          reject(
            request.error ?? new Error("Unable to clear old offline services.")
          )
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(
          transaction.error ?? new Error("Unable to clear offline services.")
        )
      transaction.onabort = () =>
        reject(
          transaction.error ?? new Error("Offline service cleanup was aborted.")
        )
    })
  } finally {
    database.close()
  }
}
