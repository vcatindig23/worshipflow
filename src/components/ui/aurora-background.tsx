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
        "wf-aurora-background relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--background)] text-[var(--foreground)]",
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
      <div className="relative z-10 w-full">{children}</div>
    </div>
  )
}

export default AuroraBackground
