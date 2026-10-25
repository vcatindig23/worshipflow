"use client"

import { LoaderCircle } from "lucide-react"
import { useFormStatus } from "react-dom"
import { Button } from "./button"

type Props = { children: React.ReactNode; pendingText?: string; className?: string; disabled?: boolean }

export default function FormSubmitButton({ children, pendingText = "Saving...", className = "", disabled = false }: Props) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled
  return (
    <Button type="submit" disabled={isDisabled} aria-disabled={isDisabled} aria-busy={pending} data-no-loading-feedback className={className}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingText : children}
    </Button>
  )
}