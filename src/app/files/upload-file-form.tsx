"use client"

import { useRouter } from "next/navigation"
import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react"
import {
  AlertCircle,
  CheckCircle2,
  File,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getPublicEnv } from "@/lib/supabase/env"

const maxFileSize = 25 * 1024 * 1024
const contentTypesByExtension: Record<string, string> = {
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

type UploadStatus = "queued" | "uploading" | "complete" | "error"

type UploadItem = {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
}

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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  if (
    ["pdf", "doc", "docx", "ppt", "pptx"].includes(extension) ||
    file.type.includes("pdf") ||
    file.type.includes("word") ||
    file.type.includes("presentation")
  ) {
    return FileText
  }

  return File
}

function getUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes("bucket not found")) {
    return "The workspace file bucket is missing. Apply the workspace-files database migration, then try again."
  }
  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("not allowed")
  ) {
    return "Your account is not allowed to upload files. Check that you have an editor role and that the workspace-files policies are applied."
  }
  if (
    normalizedMessage.includes("mime") ||
    normalizedMessage.includes("content type") ||
    normalizedMessage.includes("unsupported media")
  ) {
    return "This file type is not allowed. Choose a PDF, Office document, image, or supported audio file."
  }
  if (
    normalizedMessage.includes("payload too large") ||
    normalizedMessage.includes("file size") ||
    normalizedMessage.includes("entity too large")
  ) {
    return "The file exceeds the storage limit. Choose a file no larger than 25 MB."
  }
  if (
    normalizedMessage.includes("secret api key required") ||
    normalizedMessage.includes("invalid api key")
  ) {
    return "Supabase rejected the configured publishable API key. Check the project's Data API settings."
  }
  if (
    normalizedMessage.includes("session expired") ||
    normalizedMessage.includes("jwt") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("401")
  ) {
    return "Your sign-in session may have expired. Refresh the page and sign in again."
  }

  return "The file could not be uploaded. Please check the file type and size, then try again."
}

function getResponseMessage(responseText: string, status: number) {
  try {
    const payload = JSON.parse(responseText) as {
      message?: unknown
      error?: unknown
      error_description?: unknown
    }
    const message =
      payload.message ?? payload.error_description ?? payload.error

    if (typeof message === "string" && message.trim()) return message
  } catch {
    // The Storage API may return non-JSON text for proxy errors.
  }

  return `Upload failed (HTTP ${status}).`
}

export default function UploadFileForm({
  organizationId,
}: UploadFileFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestsRef = useRef(new Map<string, XMLHttpRequest>())
  const cancelledIdsRef = useRef(new Set<string>())
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)

  function updateUpload(id: string, update: Partial<UploadItem>) {
    setUploads((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item))
    )
  }

  async function uploadOne(item: UploadItem): Promise<boolean> {
    const { file, id } = item

    if (file.size === 0) {
      updateUpload(id, { status: "error", error: "This file is empty." })
      return false
    }
    if (file.size > maxFileSize) {
      updateUpload(id, { status: "error", error: "Files must be 25 MB or smaller." })
      return false
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    const contentType = contentTypesByExtension[extension]
    if (!contentType) {
      updateUpload(id, {
        status: "error",
        error: "Choose a PDF, Office document, image, or supported audio file.",
      })
      return false
    }

    updateUpload(id, { status: "uploading", progress: 0, error: undefined })

    try {
      const supabase = createClient()
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (cancelledIdsRef.current.has(id)) {
        cancelledIdsRef.current.delete(id)
        return false
      }

      const accessToken = data.session?.access_token
      if (!accessToken) throw new Error("Your session expired. Please sign in again.")

      const {
        NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      } = getPublicEnv()

      const objectPath = [
        organizationId,
        `${crypto.randomUUID()}-${safeFileName(file.name)}`,
      ].join("/")
      const encodedPath = objectPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")
      const endpoint =
        `${NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}` +
        `/storage/v1/object/workspace-files/${encodedPath}`

      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest()
        requestsRef.current.set(id, request)

        request.open("POST", endpoint)
        request.setRequestHeader("Authorization", `Bearer ${accessToken}`)
        request.setRequestHeader("apikey", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
        request.setRequestHeader("Content-Type", contentType)
        request.setRequestHeader("x-upsert", "false")

        request.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable || event.total <= 0) return
          updateUpload(id, {
            progress: Math.min(99, Math.round((event.loaded / event.total) * 100)),
          })
        })

        request.addEventListener("load", () => {
          requestsRef.current.delete(id)
          if (request.status >= 200 && request.status < 300) {
            updateUpload(id, { status: "complete", progress: 100, error: undefined })
            resolve()
          } else {
            reject(new Error(getResponseMessage(request.responseText, request.status)))
          }
        })

        request.addEventListener("error", () => {
          requestsRef.current.delete(id)
          reject(new Error("Network error while uploading."))
        })

        request.addEventListener("abort", () => {
          requestsRef.current.delete(id)
          reject(new Error("Upload cancelled."))
        })

        request.send(file)
      })

      return true
    } catch (uploadError) {
      if (cancelledIdsRef.current.has(id)) {
        cancelledIdsRef.current.delete(id)
        return false
      }

      updateUpload(id, {
        status: "error",
        error: getUploadErrorMessage(uploadError),
      })
      return false
    } finally {
      requestsRef.current.delete(id)
    }
  }

  function addFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files)
    if (selectedFiles.length === 0) return

    const newItems: UploadItem[] = selectedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: "queued",
    }))
    setUploads((current) => [...current, ...newItems])

    void Promise.all(newItems.map(uploadOne)).then((results) => {
      if (results.some(Boolean)) router.refresh()
    })
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.currentTarget.files ?? [])
    event.currentTarget.value = ""
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  function handleDropzoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }

  function removeUpload(item: UploadItem) {
    if (item.status === "uploading" || item.status === "queued") {
      cancelledIdsRef.current.add(item.id)
      requestsRef.current.get(item.id)?.abort()
    }

    setUploads((current) => current.filter((entry) => entry.id !== item.id))
  }

  function clearCompleted() {
    setUploads((current) => current.filter((item) => item.status !== "complete"))
  }

  const completedCount = uploads.filter((item) => item.status === "complete").length
  const activeCount = uploads.filter(
    (item) => item.status === "uploading" || item.status === "queued"
  ).length

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.m4a,.wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose files to upload"
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Choose files or drag and drop them to upload"
        aria-describedby="file-upload-help"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleDropzoneKeyDown}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          const nextTarget = event.relatedTarget
          if (
            !(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)
          ) {
            setIsDragging(false)
          }
        }}
        onDrop={handleDrop}
        className={`group relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-5 py-8 text-center outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out focus-visible:ring-4 focus-visible:ring-[var(--brand)]/15 motion-reduce:transition-none ${
          isDragging
            ? "scale-[1.01] border-[var(--brand)] bg-[var(--brand-soft)] shadow-md"
            : "border-[var(--border)] bg-[var(--surface)]/50 hover:border-[var(--brand)]/60 hover:bg-[var(--brand-soft)]/40"
        }`}
      >
        <span
          className={`mb-4 flex size-14 items-center justify-center rounded-2xl transition duration-200 ${
            isDragging
              ? "scale-110 bg-[var(--brand)] text-white"
              : "bg-[var(--brand-soft)] text-[var(--brand)] group-hover:scale-105"
          }`}
        >
          <UploadCloud className="size-7" strokeWidth={1.8} />
        </span>

        <p className="text-sm font-semibold text-[var(--foreground)]">
          {isDragging ? "Drop your files to upload" : "Drag and drop files here"}
        </p>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          or <span className="font-semibold text-[var(--brand)] underline-offset-4 group-hover:underline">browse files</span> from your device
        </p>
        <p id="file-upload-help" className="mt-3 text-xs leading-5 text-[var(--muted)]">
          PDF, Office documents, images, and audio · Up to 25 MB per file · Multiple files supported
        </p>
      </div>

      {uploads.length > 0 ? (
        <section aria-label="Upload queue" className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Upload queue</p>
              <p aria-live="polite" className="mt-0.5 text-xs text-[var(--muted)]">
                {activeCount > 0
                  ? `${activeCount} uploading · ${completedCount} completed`
                  : `${completedCount} of ${uploads.length} completed`}
              </p>
            </div>
            {completedCount > 0 ? (
              <button
                type="button"
                onClick={clearCompleted}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/25"
              >
                Clear completed
              </button>
            ) : null}
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {uploads.map((item) => {
              const Icon = getFileIcon(item.file)
              const isActive = item.status === "uploading" || item.status === "queued"
              const isComplete = item.status === "complete"
              const isError = item.status === "error"

              return (
                <li key={item.id} className="flex items-start gap-3 px-4 py-4 sm:items-center">
                  <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : isError
                        ? "bg-red-50 text-red-700"
                        : "bg-[var(--brand-soft)] text-[var(--brand)]"
                  }`}>
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="max-w-full truncate text-sm font-medium text-[var(--foreground)] sm:max-w-[min(60vw,460px)]">
                        {item.file.name}
                      </p>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>

                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface)]"
                      role="progressbar"
                      aria-label={`Upload progress for ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.progress}
                    >
                      <div
                        className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none ${
                          isComplete
                            ? "bg-emerald-600"
                            : isError
                              ? "bg-red-500"
                              : "bg-[var(--brand)]"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                          <CheckCircle2 className="size-3.5" />
                          Uploaded successfully
                        </span>
                      ) : isError ? (
                        <span className="inline-flex items-start gap-1.5 text-red-700">
                          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                          <span>{item.error ?? "Upload failed."}</span>
                        </span>
                      ) : item.status === "queued" ? (
                        <span className="text-[var(--muted)]">Preparing upload…</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                          <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                          Uploading · {item.progress}%
                        </span>
                      )}
                    </div>
                  </div>

                  {!isComplete ? (
                    <button
                      type="button"
                      onClick={() => removeUpload(item)}
                      aria-label={isActive ? `Cancel upload of ${item.file.name}` : `Remove ${item.file.name} from upload queue`}
                      title={isActive ? "Cancel upload" : "Remove file"}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
