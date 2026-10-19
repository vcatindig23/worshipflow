import { describe, expect, it } from "vitest"
import { calculateDashboardTourLayout } from "../../src/lib/dashboard-tour-layout"

describe("dashboard tour callout layout", () => {
  it("places a tall desktop navigation target beside its tooltip", () => {
    const layout = calculateDashboardTourLayout(
      { left: 12, top: 120, width: 240, height: 420 },
      1440,
      900,
    )

    expect(layout.placement).toBe("right")
    expect(layout.tooltip.left).toBeGreaterThanOrEqual(
      layout.spotlight.left + layout.spotlight.width,
    )
    expect(layout.tooltip.left + layout.tooltip.width).toBeLessThanOrEqual(1440 - 16)
    expect(layout.tooltip.top).toBeGreaterThanOrEqual(12)
    expect(layout.tooltip.top).toBeLessThanOrEqual(900 - 352 - 12)
  })

  it("keeps the callout inside a narrow mobile viewport", () => {
    const layout = calculateDashboardTourLayout(
      { left: 20, top: 240, width: 340, height: 130 },
      390,
      844,
    )

    expect(layout.placement).not.toBe("right")
    expect(layout.tooltip.left).toBeGreaterThanOrEqual(16)
    expect(layout.tooltip.left + layout.tooltip.width).toBeLessThanOrEqual(390 - 16)
    expect(layout.tooltip.top).toBeGreaterThanOrEqual(12)
    expect(layout.tooltip.top).toBeLessThanOrEqual(844 - 352 - 12)
    expect(layout.spotlight.left).toBeGreaterThanOrEqual(8)
    expect(layout.spotlight.left + layout.spotlight.width).toBeLessThanOrEqual(390 - 8)
  })

  it("positions the callout above targets near the bottom of the screen", () => {
    const layout = calculateDashboardTourLayout(
      { left: 32, top: 700, width: 120, height: 70 },
      390,
      844,
    )

    expect(layout.placement).toBe("above")
    expect(layout.tooltip.top + 352).toBeLessThanOrEqual(layout.spotlight.top)
  })
})
