import { describe, expect, it } from "vitest"
import {
  getSongPracticeSettingsStorageKey,
  parseSongPracticeSettings,
} from "../../src/lib/song-practice-settings"

describe("song practice settings", () => {
  it("scopes stored preferences to the workspace, user, and song", () => {
    expect(getSongPracticeSettingsStorageKey("org-1", "user-1", "song-1")).toBe(
      "worshipflow:practice-settings:v1:org-1:user-1:song-1"
    )
    expect(getSongPracticeSettingsStorageKey("org-1", "user-2", "song-1")).not.toBe(
      getSongPracticeSettingsStorageKey("org-1", "user-1", "song-1")
    )
    expect(getSongPracticeSettingsStorageKey("org-1", "user-1", undefined)).toBeNull()
  })

  it("loads only supported preference values", () => {
    expect(
      parseSongPracticeSettings(
        JSON.stringify({
          tempo: 112,
          countInEnabled: false,
          playbackRate: 0.75,
          fontSize: 30,
          showChords: false,
          transposeAmount: -4,
          capo: 3,
          scrollSpeed: 2,
          isPlaying: true,
          currentTime: 72,
        })
      )
    ).toEqual({
      tempo: 112,
      countInEnabled: false,
      playbackRate: 0.75,
      fontSize: 30,
      showChords: false,
      transposeAmount: -4,
      capo: 3,
      scrollSpeed: 2,
    })
  })

  it("rejects unsupported or out-of-range values without discarding valid settings", () => {
    expect(
      parseSongPracticeSettings(
        JSON.stringify({
          tempo: 500,
          playbackRate: 1.1,
          fontSize: 8,
          showChords: "false",
          transposeAmount: 13,
          capo: -1,
          scrollSpeed: 4,
          countInEnabled: true,
        })
      )
    ).toEqual({ countInEnabled: true })
  })

  it("safely handles malformed, empty, or non-object storage data", () => {
    expect(parseSongPracticeSettings(null)).toEqual({})
    expect(parseSongPracticeSettings("")).toEqual({})
    expect(parseSongPracticeSettings("{broken json")).toEqual({})
    expect(parseSongPracticeSettings("[]")).toEqual({})
    expect(parseSongPracticeSettings('"plain text"')).toEqual({})
  })
})
