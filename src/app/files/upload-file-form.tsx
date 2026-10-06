"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const maxFileSize = 25 * 1024 * 1024

type UploadFileFormProps = {
  organizationId: string
}

function safeFileName(fileName: string) {
  const name = fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "")
    .slice(-120)

  return name || "file"
}

export default function UploadFileForm({
  organizationId,
}: UploadFileFormProps) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function uploadFile(formData: FormData) {
    const file = formData.get("file")

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.")
      return
    }

    if (file.size > maxFileSize) {
      setError("Files must be 25 MB or smaller.")
      return
    }

    setUploading(true)
    setError("")

    try {
      const supabase = createClient()
      const objectPath = [
        organizationId,
        `${crypto.randomUUID()}-${safeFileName(file.name)}`,
      ].join("/")

      const { error: uploadError } = await supabase.storage
        .from("workspace-files")
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      formData.set("file", "")
      router.refresh()
    } catch (uploadError) {
      console.error("Workspace file upload failed:", uploadError)
      setError("The file could not be uploaded. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <form action={uploadFile} className="space-y-3">
      <label
        htmlFor="file"
        className="block text-sm font-medium text-[var(--foreground)]"
      >
        Choose a file
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
          disabled={uploading}
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--brand)]"
        />

        <button
          type="submit"
          disabled={uploading}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload file"}
        </button>
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        PDF, Office documents, images, and audio files up to 25 MB.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  )
}
