"use client"

import { Trash2 } from "lucide-react"
import { deleteServiceTemplate } from "../../template-actions"

export default function DeleteTemplateForm({
  templateId,
  templateName,
}: {
  templateId: string
  templateName: string
}) {
  return (
    <form
      action={deleteServiceTemplate}
      onSubmit={(event) => {
        if (!window.confirm("Delete the service template \"" + templateName + "\"? This cannot be undone.")) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="templateId" value={templateId} />
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Delete template
      </button>
    </form>
  )
}
