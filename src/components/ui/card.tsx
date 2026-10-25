import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("wf-card", className)} {...props} />
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "space-y-2 border-b border-[var(--border)] p-5 sm:p-6",
        className
      )}
      {...props}
    />
  )
}
export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("wf-section-title", className)} {...props} />
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />
}
