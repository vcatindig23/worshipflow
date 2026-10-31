import { expect, test } from "@playwright/test"

function pdfPageCount(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length
}

test("song chart exports a multi-page PDF with consecutive intro chords intact", async ({ page }) => {
  await page.goto("/login")

  const lines = Array.from({ length: 115 }, (_, index) => {
    if (index === 0) {
      return '<div class="wf-song-print-chord-row"><span class="wf-song-print-chord-label">C</span><span class="wf-song-print-chord-label">G</span><span class="wf-song-print-chord-label">Am</span><span class="wf-song-print-chord-label">F</span></div>'
    }
    if (index % 12 === 0) {
      return '<h2 class="wf-song-print-section">Verse ' + index + '</h2>'
    }
    return '<div class="wf-song-print-line">[C]A lyric line with [G]chord anchors and enough words to exercise natural wrapping across the printable page width.</div>'
  }).join("")

  await page.evaluate((content) => {
    document.body.innerHTML = `
      <main class="wf-song-print-page">
        <div class="wf-song-print-controls"><button>Print / Save PDF</button><select><option>Rehearsal</option></select></div>
        <article class="wf-song-print-sheet" style="font-size: 14pt">
          <header class="wf-song-print-header"><h1>PDF Audit Song</h1><p>Artist · Key: C · 108 BPM · 4/4 · Capo: 2</p></header>
          <div class="wf-song-print-content" style="column-count: 2; column-gap: 2rem">${content}</div>
        </article>
      </main>`
  }, lines)

  await page.emulateMedia({ media: "print" })
  await expect(page.locator(".wf-song-print-controls")).toBeHidden()
  await expect(page.locator(".wf-song-print-chord-label")).toHaveCount(4)

  const pdf = await page.pdf({ format: "A4", printBackground: true })
  expect(pdf.byteLength).toBeGreaterThan(10_000)
  expect(pdfPageCount(pdf)).toBeGreaterThan(1)
})

test("setlist service plan exports a multi-page PDF without interface controls", async ({ page }) => {
  await page.goto("/login")

  const rows = Array.from({ length: 95 }, (_, index) => `
    <li class="break-inside-avoid flex items-start gap-3">
      <span>${index + 1}.</span>
      <div><strong>Service item ${index + 1}</strong><p>Detailed notes for the service plan that should wrap naturally and remain together where possible.</p></div>
    </li>`
  ).join("")

  await page.evaluate((content) => {
    document.body.innerHTML = `
      <main class="setlist-print-layout">
        <div class="setlist-print-hide"><a href="/setlists">Back</a><button>Print / Save as PDF</button></div>
        <header class="setlist-print-header"><h1>Sunday Worship Service</h1><p>Unity in Jesus · October 31, 2026 · 9:00 AM · Main Hall</p></header>
        <section class="rounded-2xl border p-5"><h2>Run of show</h2><ol>${content}</ol></section>
        <footer>Prepared in WorshipFlow</footer>
      </main>`
  }, rows)

  await page.emulateMedia({ media: "print" })
  await expect(page.locator(".setlist-print-hide")).toBeHidden()
  await expect(page.locator(".setlist-print-header h1")).toHaveText("Sunday Worship Service")

  const pdf = await page.pdf({ format: "A4", printBackground: true })
  expect(pdf.byteLength).toBeGreaterThan(10_000)
  expect(pdfPageCount(pdf)).toBeGreaterThan(1)
})
