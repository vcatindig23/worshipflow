import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--wf-radius-control)] text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]",
        destructive: "bg-[var(--danger-action)] text-[var(--danger-foreground)] hover:bg-[var(--danger-action-hover)]",
        outline: "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        secondary: "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--brand-soft)]",
        ghost: "text-[var(--foreground)] hover:bg-[var(--surface)]",
        link: "text-[var(--brand-ink)] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1.5 rounded-lg px-3",
        lg: "min-h-12 rounded-xl px-6",
        icon: "size-11",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button }
