import { expect, test } from "@playwright/test"

const aspectRatios = [
  { width: 1920, height: 1080, label: "16:9 desktop" },
  { width: 1440, height: 1080, label: "4:3 desktop" },
  { width: 1280, height: 720, label: "16:9 laptop" },
  { width: 1024, height: 768, label: "4:3 tablet landscape" },
  { width: 390, height: 844, label: "mobile portrait" },
]

test("live stage keeps lyric size, chord placement, and line width stable across aspect ratios", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/__e2e/live-stage")

  await expect(page.getByRole("heading", { name: "Grace in Every Season" })).toBeVisible()

  const lyricsRegion = page.getByRole("region", { name: "Live lyrics and chords" })
  const longLine = page.getByTestId("stage-lyrics-line").filter({
    hasText: "Amazing grace, how sweet the sound",
  })
  const shortLine = page.getByTestId("stage-lyrics-line").filter({
    hasText: "You are faithful.",
  })
  const intro = page.getByTestId("stage-chord-progression")

  await expect(longLine).toBeVisible()
  await expect(shortLine).toBeVisible()
  await expect(intro).toBeVisible()
  await expect(intro.getByRole("button")).toHaveCount(7)
  await expect(page.getByText("Key G", { exact: false })).toBeVisible()

  for (const viewport of aspectRatios) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    const longMetrics = await longLine.evaluate((element) => {
      const line = element as HTMLElement
      const container = line.closest('[aria-label="Live lyrics and chords"]') as HTMLElement
      const style = getComputedStyle(line)
      return {
        fontSize: style.fontSize,
        letterSpacing: style.letterSpacing,
        textAlign: style.textAlign,
        paddingTop: style.paddingTop,
        width: line.getBoundingClientRect().width,
        containerWidth: container.clientWidth,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
      }
    })

    expect(longMetrics.fontSize, viewport.label).toBe("44px")
    expect(longMetrics.letterSpacing, viewport.label).toBe("normal")
    expect(longMetrics.textAlign, viewport.label).toBe("center")
    expect(longMetrics.paddingTop, viewport.label).toBe("62.48px")
    expect(longMetrics.width, viewport.label).toBeLessThanOrEqual(longMetrics.containerWidth)
    expect(longMetrics.scrollWidth, viewport.label).toBeLessThanOrEqual(longMetrics.clientWidth + 1)

    const chordBottom = await longLine
      .getByRole("button", { name: "Show G chord diagram" })
      .evaluate((button) => (button.parentElement as HTMLElement).style.bottom)
    expect(chordBottom, viewport.label).toBe("36.08px")

    const shortWidth = await shortLine.evaluate(
      (element) => element.getBoundingClientRect().width
    )
    if (viewport.width >= 1024) {
      const containerWidth = await lyricsRegion.evaluate(
        (element) => element.clientWidth
      )
      expect(shortWidth, viewport.label).toBeLessThan(containerWidth - 100)
    }
  }
})

test("live stage handles missing charts and fullscreen transitions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/__e2e/live-stage")

  await expect(page.getByText("Key G", { exact: false })).toBeVisible()
  await page.getByRole("button", { name: "Next" }).click()

  await expect(
    page.getByRole("heading", { name: "Song without a chart" })
  ).toBeVisible()
  await expect(
    page.getByText("No lyrics or chords are available for this song.")
  ).toBeVisible()

  await page.getByRole("button", { name: "Previous" }).click()
  await expect(page.getByRole("heading", { name: "Grace in Every Season" })).toBeVisible()

  await page.getByRole("button", { name: "Enter fullscreen" }).click()
  await expect(page.getByRole("button", { name: "Exit fullscreen" })).toBeVisible()
  expect(
    await page.evaluate(() => Boolean(document.fullscreenElement))
  ).toBe(true)

  await page.getByRole("button", { name: "Exit fullscreen" }).click()
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible()
  expect(
    await page.evaluate(() => Boolean(document.fullscreenElement))
  ).toBe(false)
})

test("Song Stage Mode keeps the chosen font size and centers natural lyric widths", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto("/__e2e/song-stage")

  await page.getByRole("button", { name: "Stage Mode" }).click()
  const lyricsRegion = page.getByRole("region", {
    name: "Stage mode lyrics and chords",
  })
  const longLine = page.getByTestId("stage-lyrics-line").filter({
    hasText: "Amazing grace, how sweet the sound",
  })
  const shortLine = page.getByTestId("stage-lyrics-line").filter({
    hasText: "You are faithful.",
  })

  await expect(lyricsRegion).toBeVisible()
  await expect(longLine).toBeVisible()
  await expect(shortLine).toBeVisible()
  await expect(page.getByTestId("stage-chord-progression").getByRole("button")).toHaveCount(7)

  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(longLine).toHaveCSS("font-size", "44px")
    await expect(longLine).toHaveCSS("letter-spacing", "normal")
    await expect(longLine).toHaveCSS("text-align", "center")

    const sizes = await Promise.all([
      shortLine.evaluate((element) => element.getBoundingClientRect().width),
      lyricsRegion.evaluate((element) => element.clientWidth),
    ])
    if (viewport.width > 1024) {
      expect(sizes[0]).toBeLessThan(sizes[1] - 100)
    }
    const scrollMetrics = await lyricsRegion.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }))
    expect(scrollMetrics.scrollWidth).toBeLessThanOrEqual(scrollMetrics.clientWidth + 1)
  }
})
