"use client"

import { useState } from "react"
import type { InputHTMLAttributes } from "react"
import { Eye, EyeOff } from "lucide-react"

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  className?: string
}

export default function PasswordInput({
  className = "",
  ...inputProps
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={isVisible ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-controls={inputProps.id}
        aria-pressed={isVisible}
        title={isVisible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 inline-flex min-w-11 items-center justify-center rounded-r-xl text-[var(--muted)] transition-colors hover:text-[var(--brand)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      >
        {isVisible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  )
}
