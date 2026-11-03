import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("song library and Chord Chart UX", () => {
  it("shows removable filters without resetting the current page", () => {
    const songsPage = source("src/app/songs/page.tsx")

    expect(songsPage).toContain('aria-label="Active song filters"')
    expect(songsPage).toContain("filterChips.map")
    expect(songsPage).toContain("keepCurrentPage")
    expect(songsPage).toContain("href={clearFiltersHref}")
    expect(songsPage).toContain("Sort: ")
    expect(songsPage).toContain('aria-label="List view"')
    expect(songsPage).toContain('aria-label="Grid view"')
  })

  it("keeps scan-critical song metadata visible in list and grid cards", () => {
    const songsPage = source("src/app/songs/page.tsx")

    expect(songsPage).toContain("Key {song.current_key}")
    expect(songsPage).toContain("{song.tempo} BPM")
    expect(songsPage).toContain("Capo {song.capo}")
    expect(songsPage).toContain("{song.time_signature}")
    expect(songsPage).toContain("[overflow-wrap:anywhere]")
  })

  it("requires confirmation and workspace authorization for bulk archive and restore", () => {
    const songsPage = source("src/app/songs/page.tsx")
    const actions = source("src/app/songs/actions.ts")

    expect(songsPage).toContain('id="bulk-song-actions"')
    expect(songsPage).toContain('form="bulk-song-actions"')
    expect(songsPage).toContain("<ConfirmSubmitButton")
    expect(songsPage).toContain("Archive selected songs?")
    expect(songsPage).toContain("Restore selected songs?")
    expect(actions).toContain(".min(1).max(50)")
    expect(actions).toContain('hasPermission(membership.role, "songs:edit")')
    expect(actions).toContain('.in("id", result.data.songIds)')
    expect(actions).toContain('.eq("organization_id", membership.organization_id)')
  })

  it("exposes dirty and saving states while retaining navigation protection", () => {
    const protectedForm = source("src/components/ui/protected-form.tsx")
    const editPage = source("src/app/songs/[id]/edit/page.tsx")
    const newPage = source("src/app/songs/new/page.tsx")

    expect(protectedForm).toContain('showStatus = false')
    expect(protectedForm).toContain('"Unsaved changes"')
    expect(protectedForm).toContain('"Saving your song…"')
    expect(protectedForm).toContain('"No unsaved changes"')
    expect(protectedForm).toContain('window.addEventListener("beforeunload", beforeUnload)')
    expect(editPage).toContain("showStatus")
    expect(newPage).toContain("showStatus")
  })

  it("renders a live chart preview and links ChordPro errors to source lines", () => {
    const editor = source("src/components/songs/chordpro-import-editor.tsx")

    expect(editor).toContain("parseChordPro(value)")
    expect(editor).toContain("buildSongDisplayLines(parsedSong.lines)")
    expect(editor).toContain("<ChordProLine")
    expect(editor).toContain("Live chart preview")
    expect(editor).toContain("focusValidationLine(validationError)")
    expect(editor).toContain("jump to line")
    expect(editor).toContain("message.match(/^Line")
  })

  it("labels changed, added, and removed lines with text and icons", () => {
    const comparison = source("src/components/songs/song-version-comparison.tsx")

    expect(comparison).toContain("<PencilLine")
    expect(comparison).toContain("<Plus")
    expect(comparison).toContain("<Minus")
    expect(comparison).toContain('"Changed"')
    expect(comparison).toContain('"Added"')
    expect(comparison).toContain('"Removed"')
  })

  it("distinguishes missing, loading, buffering, blocked, and failed audio states", () => {
    const practicePanel = source("src/components/songs/song-viewer.tsx")
    const audioPlayer = source("src/components/songs/reference-audio-player.tsx")

    expect(practicePanel).toContain("No reference recording is attached")
    expect(practicePanel).toContain("saved reference recording is unavailable")
    expect(audioPlayer).toContain('"loading" | "ready" | "buffering" | "error" | "blocked"')
    expect(audioPlayer).toContain("onWaiting")
    expect(audioPlayer).toContain("onCanPlay")
    expect(audioPlayer).toContain("Retry audio")
    expect(audioPlayer).toContain("MEDIA_ERR_DECODE")
  })

  it("supports keyboard navigation and identifies calculated guitar fallbacks", () => {
    const chart = source("src/components/chord-chart/chord-chart-explorer.tsx")

    expect(chart).toContain('role="group"')
    expect(chart).toContain('event.key === "ArrowLeft"')
    expect(chart).toContain('event.key === "ArrowRight"')
    expect(chart).toContain('event.key === "Home"')
    expect(chart).toContain('event.key === "End"')
    expect(chart).toContain("Calculated fallback voicing.")
    expect(chart).toContain("querySelectorAll<HTMLButtonElement>")
  })
})
