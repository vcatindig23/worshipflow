"use client"

import { useState } from "react"
import { Trash2, X } from "lucide-react"
import { deleteServiceTemplate } from "../../template-actions"

export default function DeleteTemplateForm({
  templateId,
  templateName,
}: {
  templateId: string
  templateName: string
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <form action={deleteServiceTemplate}>
        <input type="hidden" name="templateId" value={templateId} />
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          <Trash2 className="size-4" />
          Delete template
        </button>
        {confirmOpen ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false) }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-template-title" aria-describedby="delete-template-description" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-[var(--foreground)] shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-700"><Trash2 className="size-5" /></div>
                <button type="button" onClick={() => setConfirmOpen(false)} aria-label="Close confirmation" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)]"><X className="size-4" /></button>
              </div>
              <h2 id="delete-template-title" className="mt-5 text-lg font-semibold">Delete this template?</h2>
              <p id="delete-template-description" className="mt-2 text-sm leading-6 text-[var(--muted)]">“{templateName}” will be permanently deleted. This action cannot be undone.</p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setConfirmOpen(false)} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--surface)]">Cancel</button>
                <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700">Delete template</button>
              </div>
            </section>
          </div>
        ) : null}
      </form>
    </>
  )
}
