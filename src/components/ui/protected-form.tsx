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
export function ProtectedForm({
  children,
  showStatus = false,
  ...props
}: ComponentProps<"form"> & { showStatus?: boolean }) {
  const ref = useRef<HTMLFormElement>(null)
  const baseline = useRef("")
  const dirty = useRef(false)
  const [destination, setDestination] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"clean" | "dirty" | "saving">("clean")
  useEffect(() => {
    const form = ref.current
    if (!form) return
    baseline.current = fingerprint(form)
    const update = () => {
      const hasChanges = fingerprint(form) !== baseline.current
      dirty.current = hasChanges
      if (showStatus) setSaveStatus(hasChanges ? "dirty" : "clean")
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
  }, [showStatus])
  return (
    <>
      <form
        {...props}
        ref={ref}
        onSubmit={(event) => {
          props.onSubmit?.(event)
          if (!event.defaultPrevented) {
            dirty.current = false
            if (showStatus) setSaveStatus("saving")
          }
        }}
      >
        {showStatus ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
          >
            <span
              aria-hidden="true"
              className={
                "size-2 shrink-0 rounded-full " +
                (saveStatus === "dirty"
                  ? "bg-[var(--warning)]"
                  : saveStatus === "saving"
                    ? "animate-pulse bg-[var(--brand)]"
                    : "bg-[var(--success)]")
              }
            />
            <span className="font-medium text-[var(--foreground)]">
              {saveStatus === "dirty"
                ? "Unsaved changes"
                : saveStatus === "saving"
                  ? "Saving your song…"
                  : "No unsaved changes"}
            </span>
            {saveStatus === "dirty" ? (
              <span className="text-[var(--muted)]">
                Your edits are protected while you stay on this page.
              </span>
            ) : null}
          </div>
        ) : null}
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
