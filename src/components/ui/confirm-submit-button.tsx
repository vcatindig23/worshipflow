"use client"

import { useRef, useState, type ComponentProps } from "react"
import { useFormStatus } from "react-dom"
import { LoaderCircle } from "lucide-react"
import { Button } from "./button"
import { ConfirmationDialog } from "./confirmation-dialog"

export function ConfirmSubmitButton({
  title,
  description,
  confirmLabel = "Confirm",
  children,
  ...props
}: ComponentProps<typeof Button> & {
  title: string
  description: string
  confirmLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const { pending } = useFormStatus()
  return (
    <>
      <Button
        variant="outline"
        {...props}
        ref={ref}
        type="submit"
        disabled={pending || props.disabled}
        aria-busy={pending}
        data-no-loading-feedback
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {children}
      </Button>
      <ConfirmationDialog
        open={open}
        title={title}
        description={description}
        destructive
        confirmLabel={confirmLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false)
          const button = ref.current
          if (button?.form?.isConnected) button.form.requestSubmit(button)
        }}
      />
    </>
  )
}
