import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("wf-input", className)} {...props} />
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn("wf-input", className)} {...props} />
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn("wf-input min-h-32 resize-y py-3", className)}
      {...props}
    />
  )
}
