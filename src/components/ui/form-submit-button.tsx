"use client"

import { LoaderCircle } from "lucide-react"
import { useFormStatus } from "react-dom"

type Props = { children: React.ReactNode; pendingText?: string; className?: string; disabled?: boolean }

export default function FormSubmitButton({ children, pendingText = "Saving...", className = "", disabled = false }: Props) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled
  return (
    <button type="submit" disabled={isDisabled} aria-disabled={isDisabled} className={className}>
      {pending ? <LoaderCircle className="mr-2 size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingText : children}
    </button>
  )
}