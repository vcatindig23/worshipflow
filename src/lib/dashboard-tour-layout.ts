export type DashboardTourLayout = {
  spotlight: { left: number; top: number; width: number; height: number }
  tooltip: { left: number; top: number; width: number }
  placement: "above" | "below" | "right"
  arrowOffset: number
}

type ElementRect = {
  left: number
  top: number
  width: number
  height: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

export function calculateDashboardTourLayout(
  rect: ElementRect,
  viewportWidth: number,
  viewportHeight: number,
): DashboardTourLayout {
  const padding = 8
  const spotlightWidth = Math.min(rect.width + padding * 2, viewportWidth - 16)
  const spotlightHeight = Math.min(rect.height + padding * 2, viewportHeight - 16)
  const spotlightLeft = clamp(
    rect.left - padding,
    8,
    viewportWidth - spotlightWidth - 8,
  )
  const spotlightTop = clamp(
    rect.top - padding,
    8,
    viewportHeight - spotlightHeight - 8,
  )
  const spotlight = {
    left: spotlightLeft,
    top: spotlightTop,
    width: spotlightWidth,
    height: spotlightHeight,
  }

  const tooltipWidth = Math.min(360, viewportWidth - 32)
  const estimatedTooltipHeight = 352
  const gap = 18
  const roomBelow = viewportHeight - (spotlight.top + spotlight.height) - gap
  const roomAbove = spotlight.top - gap
  const roomRight =
    viewportWidth - spotlight.left - spotlight.width - gap
  const canPlaceRight =
    roomRight >= tooltipWidth + 16 &&
    spotlight.left < viewportWidth * 0.35 &&
    spotlight.width < viewportWidth * 0.45

  if (canPlaceRight) {
    const tooltipTop = clamp(
      spotlight.top + spotlight.height / 2 - estimatedTooltipHeight / 2,
      12,
      viewportHeight - estimatedTooltipHeight - 12,
    )
    const arrowOffset = clamp(
      spotlight.top + spotlight.height / 2 - tooltipTop - 8,
      24,
      estimatedTooltipHeight - 24,
    )
    return {
      spotlight,
      tooltip: {
        left: spotlight.left + spotlight.width + gap,
        top: tooltipTop,
        width: tooltipWidth,
      },
      placement: "right",
      arrowOffset,
    }
  }

  const placement: DashboardTourLayout["placement"] =
    roomBelow >= estimatedTooltipHeight || roomBelow >= roomAbove
      ? "below"
      : "above"
  const desiredTop =
    placement === "below"
      ? spotlight.top + spotlight.height + gap
      : spotlight.top - estimatedTooltipHeight - gap
  const tooltip = {
    left: clamp(
      spotlight.left + spotlight.width / 2 - tooltipWidth / 2,
      16,
      viewportWidth - tooltipWidth - 16,
    ),
    top: clamp(desiredTop, 12, viewportHeight - estimatedTooltipHeight - 12),
    width: tooltipWidth,
  }

  return {
    spotlight,
    tooltip,
    placement,
    arrowOffset: 36,
  }
}
