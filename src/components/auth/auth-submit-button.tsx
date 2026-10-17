"use client"

import { ArrowRight, LoaderCircle } from "lucide-react"
import { useFormStatus } from "react-dom"

type AuthSubmitButtonProps = {
  label: string
  pendingLabel: string
  className?: string
}

export default function AuthSubmitButton({
  label,
  pendingLabel,
  className,
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <ArrowRight aria-hidden="true" className="size-4" />
      )}
      {pending ? pendingLabel : label}
    </button>
  )
}
