"use client"

import { cn } from "@/lib/utils"
import type { HTMLProps, ReactNode } from "react"

export interface AuroraBackgroundProps extends HTMLProps<HTMLDivElement> {
  children: ReactNode
  showRadialGradient?: boolean
}

/**
 * A theme-aware, CSS-animated aurora surface.
 *
 * The animation is intentionally CSS-only, so it doesn't need a React
 * animation loop and respects the user's reduced-motion preference.
 */
export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "wf-aurora-background relative isolate min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]",
        className
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "wf-aurora-layer pointer-events-none absolute inset-0",
          showRadialGradient && "wf-aurora-radial"
        )}
      />
      <div className="relative z-10 min-h-inherit">{children}</div>
    </div>
  )
}

export default AuroraBackground
