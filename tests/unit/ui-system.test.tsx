// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Link from "next/link"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ConfirmationDialog } from "../../src/components/ui/confirmation-dialog"
import { ConfirmSubmitButton } from "../../src/components/ui/confirm-submit-button"
import { ProtectedForm } from "../../src/components/ui/protected-form"
import { Pagination } from "../../src/components/ui/pagination"
import { PageHeader } from "../../src/components/ui/page"
import { EmptyState } from "../../src/components/ui/empty-state"
import WorkspaceBreadcrumbs from "../../src/components/workspace-breadcrumbs"

let pathname = "/songs/example/edit"
vi.mock("next/navigation", () => ({ usePathname: () => pathname }))
let container: HTMLDivElement
let root: Root
function render(node: ReactNode) {
  act(() => root.render(node))
}
function click(node: Element) {
  act(() =>
    node.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    )
  )
}
function edit(value: string) {
  const input = container.querySelector("input")!
  act(() => {
    input.value = value
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "")
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open")
  }
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe("destructive confirmation", () => {
  it("requires confirmation, preserves the submitter, and allows cancellation", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {})
    render(
      <form>
        <ConfirmSubmitButton
          title="Delete file?"
          description="This permanently deletes the file."
          confirmLabel="Delete file"
        >
          Remove
        </ConfirmSubmitButton>
      </form>
    )
    const trigger = container.querySelector('button[type="submit"]')!
    click(trigger)
    expect(submit).not.toHaveBeenCalled()
    expect(container.querySelector("dialog")?.open).toBe(true)
    click(container.querySelector("dialog button")!)
    expect(container.querySelector("dialog")?.open).toBe(false)
    expect(submit).not.toHaveBeenCalled()
    click(trigger)
    click(container.querySelectorAll("dialog button")[1])
    expect(submit).toHaveBeenCalledExactlyOnceWith(trigger)
  })
  it("labels the dialog and treats Escape as cancellation", () => {
    const cancel = vi.fn()
    render(
      <ConfirmationDialog
        open
        title="Remove member?"
        description="Their workspace access will be removed."
        confirmLabel="Remove"
        onCancel={cancel}
        onConfirm={vi.fn()}
      />
    )
    const dialog = container.querySelector("dialog")!
    expect(
      document.getElementById(dialog.getAttribute("aria-labelledby")!)
        ?.textContent
    ).toBe("Remove member?")
    act(() => dialog.dispatchEvent(new Event("cancel", { cancelable: true })))
    expect(cancel).toHaveBeenCalledOnce()
  })
})
describe("editing form protection", () => {
  it("warns on unload only while values differ from the original", () => {
    render(
      <ProtectedForm>
        <input name="title" defaultValue="Original" />
      </ProtectedForm>
    )
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(unload()).toBe(false)
    edit("Updated")
    expect(unload()).toBe(true)
    edit("Original")
    expect(unload()).toBe(false)
  })
  it("intercepts a link with unsaved edits and retains them after cancellation", () => {
    render(
      <>
        <ProtectedForm>
          <input name="title" defaultValue="Original" />
        </ProtectedForm>
        <Link href="/songs">Cancel editing</Link>
      </>
    )
    edit("Unfinished chart")
    click(container.querySelector("a")!)
    expect(container.querySelector("dialog")?.open).toBe(true)
    click(container.querySelector("dialog button")!)
    expect(container.querySelector("dialog")?.open).toBe(false)
    expect(container.querySelector("input")?.value).toBe("Unfinished chart")
  })
  it("keeps the unload warning when submission is prevented", () => {
    render(
      <ProtectedForm onSubmit={(event) => event.preventDefault()}>
        <input name="title" defaultValue="Original" />
      </ProtectedForm>
    )
    edit("Updated")
    act(() =>
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    )
    const event = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(event)
    // A prevented/failed submission must keep protecting the draft.
    expect(event.defaultPrevented).toBe(true)
  })
})
describe("shared hierarchy and recovery", () => {
  it("renders one page heading and explicit primary and secondary actions", () => {
    render(
      <PageHeader
        title="Songs"
        eyebrow="Song library"
        description="Prepare your charts."
        actions={<button>Add song</button>}
      />
    )
    expect(container.querySelectorAll("h1")).toHaveLength(1)
    expect(container.querySelector("h1")?.textContent).toBe("Songs")
    expect(container.querySelector("button")?.textContent).toBe("Add song")
  })
  it("preserves query filters in pagination and disables unavailable directions", () => {
    render(
      <Pagination
        label="Song pages"
        summary="Page 1 of 2"
        nextHref="/songs?key=G&page=2"
      />
    )
    expect(container.querySelector('a[rel="next"]')?.getAttribute("href")).toBe(
      "/songs?key=G&page=2"
    )
    expect(container.querySelector('a[rel="prev"]')).toBeNull()
    expect(container.querySelector('[aria-disabled="true"]')?.textContent).toBe(
      "Previous"
    )
  })
  it("shows a recovery action in empty states", () => {
    render(
      <EmptyState
        title="No matches"
        description="Try clearing your filters."
        icon={<span />}
        actions={<Link href="/songs">Clear filters</Link>}
      />
    )
    expect(container.querySelector("h2")?.textContent).toBe("No matches")
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/songs")
  })
  it("shows parent navigation without exposing database IDs as labels", () => {
    pathname = "/songs/8be01/edit"
    render(<WorkspaceBreadcrumbs />)
    expect(container.textContent).toContain("DashboardSongsDetailsEdit")
    expect(container.textContent).not.toContain("8be01")
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Edit"
    )
  })
})
