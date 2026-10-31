import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const globalStyles = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
const setlistDetailPage = readFileSync(join(process.cwd(), "src/app/setlists/[id]/page.tsx"), "utf8")
const setlistPrintPage = readFileSync(join(process.cwd(), "src/app/setlists/[id]/print/page.tsx"), "utf8")
const songPrintSheet = readFileSync(join(process.cwd(), "src/components/songs/song-print-sheet.tsx"), "utf8")

describe("print and PDF layout regressions", () => {
  it("keeps one consistent page margin and preserves the selected song column layout", () => {
    expect(globalStyles.match(/@page\s*\{/g)).toHaveLength(1)
    expect(globalStyles).toContain("margin: 12mm")
    expect(globalStyles).not.toContain(".wf-song-print-content {\n    display: block !important;")
    expect(globalStyles).toContain("column-fill: auto")
    expect(globalStyles).toContain("overflow-wrap: break-word")
  })

  it("keeps consecutive chord-only lines as separate printable chord labels", () => {
    expect(songPrintSheet).toContain("const chordOnly = !hasLyrics")
    expect(songPrintSheet).toContain("wf-song-print-chord-row")
    expect(songPrintSheet).toContain("wf-song-print-chord-label")
    expect(globalStyles).toContain("gap: 0.5em 1.5em")
    expect(globalStyles).toContain("white-space: nowrap")
  })

  it("allows long service-plan sections to paginate while keeping individual rows together", () => {
    expect(setlistPrintPage).not.toMatch(/<section className="break-inside-avoid[^"]*bg-white p-5/)
    expect(setlistPrintPage).toContain('className="break-inside-avoid py-3 first:pt-0 last:pb-0"')
    expect(setlistPrintPage).toContain("break-inside-avoid flex items-start gap-3")
    expect(setlistPrintPage).toContain("print:max-w-none")
  })

  it("uses one dedicated setlist PDF action instead of a duplicate direct-print button", () => {
    expect(setlistDetailPage).toContain('href={`/setlists/${id}/print`}')
    expect(setlistDetailPage).toContain("Service plan PDF")
    expect(setlistDetailPage).not.toContain("PrintSetlistButton")
    expect(setlistDetailPage).not.toContain("window.print")
  })

  it("keeps print controls out of generated song and setlist documents", () => {
    expect(globalStyles).toContain(".setlist-print-hide")
    expect(globalStyles).toContain(".setlist-print-layout button")
    expect(globalStyles).toContain(".wf-song-print-controls")
    expect(globalStyles).toContain("display: none !important")
  })
})
