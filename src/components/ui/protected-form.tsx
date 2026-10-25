"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { ConfirmationDialog } from "./confirmation-dialog"

function fingerprint(form: HTMLFormElement) {
  return JSON.stringify(
    Array.from(new FormData(form), ([key, value]) => [
      key,
      typeof value === "string"
        ? value
        : value.name ? [value.name, value.size, value.lastModified] : null,
    ])
  )
}

/** Opt in only for editing forms; never stores field values outside this component. */
export function ProtectedForm({ children, ...props }: ComponentProps<"form">) {
  const ref = useRef<HTMLFormElement>(null)
  const baseline = useRef("")
  const dirty = useRef(false)
  const [destination, setDestination] = useState<string | null>(null)
  useEffect(() => {
    const form = ref.current
    if (!form) return
    baseline.current = fingerprint(form)
    const update = () => {
      dirty.current = fingerprint(form) !== baseline.current
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    const click = (event: MouseEvent) => {
      if (
        !dirty.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null
      if (!link || link.download || (link.target && link.target !== "_self"))
        return
      const url = new URL(link.href, window.location.href)
      if (
        !/^https?:$/.test(url.protocol) ||
        (url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      delete document.documentElement.dataset.wfNavigationLoading
      setDestination(url.href)
    }
    form.addEventListener("input", update)
    form.addEventListener("change", update)
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", click, true)
    return () => {
      form.removeEventListener("input", update)
      form.removeEventListener("change", update)
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", click, true)
    }
  }, [])
  return (
    <>
      <form
        {...props}
        ref={ref}
        onSubmit={(event) => {
          props.onSubmit?.(event)
          if (!event.defaultPrevented) dirty.current = false
        }}
      >
        {children}
      </form>
      <ConfirmationDialog
        open={destination !== null}
        title="Leave without saving?"
        description="You have unsaved changes in this form. Stay here to save your work, or leave and discard your edits."
        confirmLabel="Discard and leave"
        destructive
        onCancel={() => setDestination(null)}
        onConfirm={() => {
          if (destination) {
            dirty.current = false
            window.location.assign(destination)
          }
        }}
      />
    </>
  )
}
