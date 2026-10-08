import { describe, expect, it } from "vitest"
import {
  isOfflineStageSnapshot,
  MAX_OFFLINE_STAGE_BYTES,
} from "../../src/lib/offline-stage"

describe("offline live-stage snapshots", () => {
  it("accepts a prepared snapshot with song chart data", () => {
    expect(
      isOfflineStageSnapshot({
        setlistId: "service-1",
        setlistName: "Sunday",
        userId: "user-1",
        storageKey: "user-1:service-1",
        savedAt: "2026-10-08T02:00:00.000Z",
        songs: [
          {
            id: "song-1",
            title: "Amazing Grace",
            artist: "John Newton",
            source: "[G]Amazing grace",
            section: "Opening",
            key: "G",
            capo: 0,
            tempo: 72,
            notes: null,
            position: 1,
          },
        ],
      })
    ).toBe(true)
  })

  it("rejects malformed snapshot data", () => {
    expect(isOfflineStageSnapshot(null)).toBe(false)
    expect(
      isOfflineStageSnapshot({
        setlistId: "service-1",
        setlistName: "Sunday",
        userId: "user-1",
        storageKey: "user-1:service-1",
        savedAt: "today",
        songs: [{ id: "song-1" }],
      })
    ).toBe(false)
  })

  it("caps cached service size to a bounded amount", () => {
    expect(MAX_OFFLINE_STAGE_BYTES).toBe(10 * 1024 * 1024)
  })
})
