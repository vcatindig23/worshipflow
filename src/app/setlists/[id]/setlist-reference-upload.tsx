"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, UploadCloud } from "lucide-react"
import { Feedback } from "@/components/ui/feedback"
import { Input } from "@/components/ui/form-controls"
import { createClient } from "@/lib/supabase/client"
import { addServiceResource } from "./service-resources-actions"

const maxFileSize = 25 * 1024 * 1024
const allowedTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
}

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^[_\.]+|[_\.]+$/g, "").slice(-120) || "reference-file"
}

export default function SetlistReferenceUpload({ setlistId, organizationId }: { setlistId: string; organizationId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [displayName, setDisplayName] = useState("")

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    const file = inputRef.current?.files?.[0]
    if (!file) {
      setError("Choose a reference file to upload.")
      return
    }
    if (file.size > maxFileSize) {
      setError("Files must be 25 MB or smaller.")
      return
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (!allowedTypes[extension] || (file.type && file.type !== allowedTypes[extension])) {
      setError("Choose a PDF, Office document, image, or supported audio file.")
      return
    }
    const name = (displayName.trim() || file.name).trim()
    if (name.length > 120) {
      setError("The display name must be 120 characters or fewer.")
      return
    }

    setUploading(true)
    setError("")
    const supabase = createClient()
    const storagePath = organizationId + "/" + crypto.randomUUID() + "-" + safeFileName(file.name)
    const { error: uploadError } = await supabase.storage.from("workspace-files").upload(storagePath, file, {
      contentType: allowedTypes[extension],
      upsert: false,
    })
    if (uploadError) {
      setError(uploadError.message.toLowerCase().includes("row-level security")
        ? "Your account is not allowed to upload files. Ask a worship leader or editor to check file permissions."
        : "The reference file could not be uploaded. Please try again.")
      setUploading(false)
      return
    }

    const formData = new FormData()
    formData.set("setlistId", setlistId)
    formData.set("storagePath", storagePath)
    formData.set("displayName", name)
    await addServiceResource(formData)
    router.refresh()
    setUploading(false)
  }

  return (
    <form onSubmit={handleUpload} className="space-y-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-center gap-2">
        <UploadCloud className="size-4 text-[var(--brand)]" />
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Upload a reference file</h3>
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Add a service guide, PDF chart, presentation, image, or rehearsal audio directly to this setlist. It will also be saved in your workspace library.
      </p>
      <input ref={inputRef} type="file" required disabled={uploading} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav" className="block w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--brand)]" />
      <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={uploading} maxLength={120} placeholder="Display name (optional)" aria-label="Reference file display name" className="h-10 px-3" />
      <button type="submit" disabled={uploading} className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60">
        {uploading ? <><LoaderCircle className="mr-2 size-4 animate-spin" />Uploading and attaching…</> : "Upload and attach"}
      </button>
      <p className="text-xs text-[var(--muted)]">Maximum 25 MB. PDF, Office documents, images, and supported audio files.</p>
      {error ? (
        <Feedback tone="error" title="Reference upload failed">
          {error}
        </Feedback>
      ) : null}
    </form>
  )
}
