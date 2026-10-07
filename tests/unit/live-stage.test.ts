import { describe, expect, it } from "vitest"
import {
  buildLiveStageSongs,
  getBoundedStageIndex,
  parseStageSongIndex,
} from "../../src/lib/live-stage"
import { getTranspositionBetweenKeys } from "../../src/features/chordpro/transpose"

describe("live stage navigation", () => {
  it("moves within the setlist without wrapping at either end", () => {
    expect(getBoundedStageIndex(0, -1, 3)).toBe(0)
    expect(getBoundedStageIndex(0, 1, 3)).toBe(1)
    expect(getBoundedStageIndex(2, 1, 3)).toBe(2)
  })

  it("returns null for an empty setlist", () => {
    expect(getBoundedStageIndex(0, 1, 0)).toBeNull()
  })

  it("accepts only bounded non-negative integer song indices", () => {
    expect(parseStageSongIndex("0")).toBe(0)
    expect(parseStageSongIndex("999")).toBe(999)
    expect(parseStageSongIndex("-1")).toBeNull()
    expect(parseStageSongIndex("1.5")).toBeNull()
    expect(parseStageSongIndex("1000")).toBeNull()
    expect(parseStageSongIndex("9007199254740992")).toBeNull()
    expect(parseStageSongIndex("song")).toBeNull()
  })
})

describe("prepared live-stage charts", () => {
  it("prepares every song in setlist order and applies arrangement overrides", () => {
    const songs = buildLiveStageSongs(
      [
        {
          song_id: "song-b",
          position: 2,
          section: "Closing",
          key_override: "D",
          capo_override: 2,
          tempo_override: 96,
          notes: "Start softly",
        },
        {
          song_id: "song-a",
          position: 1,
          section: "Opening",
          key_override: null,
          capo_override: null,
          tempo_override: null,
          notes: null,
        },
      ],
      [
        {
          id: "song-a",
          title: "First Song",
          artist: "Band",
          current_key: "G",
          tempo: 100,
          capo: 0,
          chordpro_source: "{title: First Song}",
        },
        {
          id: "song-b",
          title: "Second Song",
          artist: null,
          current_key: "C",
          tempo: 80,
          capo: 1,
          chordpro_source: "{title: Second Song}",
        },
      ]
    )

    expect(songs.map((song) => song.title)).toEqual([
      "Second Song",
      "First Song",
    ])
    expect(songs[0]).toMatchObject({
      source: "{title: Second Song}",
      section: "Closing",
      key: "D",
      capo: 2,
      tempo: 96,
      notes: "Start softly",
      position: 2,
    })
    expect(songs[1]).toMatchObject({
      section: "Opening",
      key: "G",
      capo: 0,
      tempo: 100,
    })
  })

  it("keeps setlist entries when a referenced chart is unavailable", () => {
    expect(
      buildLiveStageSongs(
        [
          {
            song_id: "missing-song",
            position: 0,
            section: "Worship",
            key_override: null,
            capo_override: null,
            tempo_override: null,
            notes: null,
          },
        ],
        []
      )
    ).toEqual([
      {
        id: "missing-song",
        title: "Song unavailable",
        artist: null,
        source: "",
        section: "Worship",
        key: null,
        capo: null,
        tempo: null,
        notes: null,
        position: 0,
      },
    ])
  })
})

describe("setlist key transposition", () => {
  it("calculates the shortest semitone offset to a setlist key override", () => {
    expect(getTranspositionBetweenKeys("G", "A")).toBe(2)
    expect(getTranspositionBetweenKeys("Bb", "A")).toBe(-1)
    expect(getTranspositionBetweenKeys("C", "F#")).toBe(6)
  })

  it("returns null when either key is not recognizable", () => {
    expect(getTranspositionBetweenKeys("", "A")).toBeNull()
    expect(getTranspositionBetweenKeys("G", null)).toBeNull()
  })
})
