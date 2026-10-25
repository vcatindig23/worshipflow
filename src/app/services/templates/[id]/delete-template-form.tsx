"use client"

import { Trash2 } from "lucide-react"
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button"
import { deleteServiceTemplate } from "../../template-actions"

export default function DeleteTemplateForm({ templateId, templateName }: {
  templateId: string
  templateName: string
}) {
  return (
    <form action={deleteServiceTemplate}>
      <input type="hidden" name="templateId" value={templateId} />
      <ConfirmSubmitButton variant="outline" className="text-[var(--danger)]" title="Delete this template?" description={`“${templateName}” will be permanently deleted. Services already created from this template will remain available.`} confirmLabel="Delete template">
        <Trash2 className="size-4" aria-hidden="true" />Delete template
      </ConfirmSubmitButton>
    </form>
  )
}
