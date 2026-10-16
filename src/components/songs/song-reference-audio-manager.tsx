"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FileAudio, LoaderCircle, Trash2, UploadCloud } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  removeSongReferenceAudio,
  setSongReferenceAudio,
} from "@/app/songs/[id]/reference-audio-actions"

const maxAudioFileSize = 25 * 1024 * 1024
const audioTypesByExtension: Record<string, { mime: string; accepted: string[] }> = {
  mp3: { mime: "audio/mpeg", accepted: ["audio/mpeg", "audio/mp3"] },
  m4a: { mime: "audio/mp4", accepted: ["audio/mp4", "audio/x-m4a", "audio/m4a"] },
  wav: { mime: "audio/wav", accepted: ["audio/wav", "audio/x-wav", "audio/vnd.wave"] },
}

type SongReferenceAudioManagerProps = {
  songId: string
  organizationId: string
  currentAudioPath: string | null
  currentAudioName: string | null
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "")
    .slice(-120) || "reference-audio"
}

function describeActionError(code: string) {
  if (code === "permission_denied") return "Only administrators, worship leaders, and song editors can manage reference audio."
  if (code === "song_not_found") return "This song could not be found in your current workspace."
  if (code === "invalid_audio_file") return "Choose a valid MP3, M4A, or WAV audio file from your workspace."
  if (code === "save_failed") return "The audio uploaded, but it could not be linked to the song. Try again."
  return "The reference audio could not be attached. Please try again."
}

function formatUploadError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes("row-level security") || normalized.includes("permission denied")) {
    return "Your account is not allowed to upload to the workspace file library. Ask an administrator to check file permissions."
  }
  if (normalized.includes("bucket not found")) {
    return "The workspace file storage bucket is unavailable. Check the Supabase Storage setup."
  }
  if (normalized.includes("mime") || normalized.includes("content type")) {
    return "The workspace file bucket rejected this audio format."
  }
  if (normalized.includes("payload too large") || normalized.includes("file size")) {
    return "The file is too large. Choose an audio file no larger than 25 MB."
  }
  return "Upload failed. Check your connection and try again."
}

export default function SongReferenceAudioManager({
  songId,
  organizationId,
  currentAudioPath,
  currentAudioName,
}: SongReferenceAudioManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading || removing) return

    const file = inputRef.current?.files?.[0]
    if (!file || file.size === 0) {
      setError("Choose an audio file to upload.")
      return
    }
    if (file.size > maxAudioFileSize) {
      setError("Audio files must be 25 MB or smaller.")
      return
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    const audioType = audioTypesByExtension[extension]
    if (
      !audioType ||
      (file.type !== "" && !audioType.accepted.includes(file.type.toLowerCase()))
    ) {
      setError("Choose an MP3, M4A, or WAV audio file.")
      return
    }

    setUploading(true)
    setError("")
    setSuccess("")
    const supabase = createClient()
    const storagePath = [
      organizationId,
      `${crypto.randomUUID()}-${safeFileName(file.name)}`,
    ].join("/")

    try {
      const { error: uploadError } = await supabase.storage
        .from("workspace-files")
        .upload(storagePath, file, {
          contentType: audioType.mime,
          upsert: false,
          cacheControl: "3600",
        })

      if (uploadError) {
        setError(formatUploadError(uploadError.message))
        return
      }

      const formData = new FormData()
      formData.set("songId", songId)
      formData.set("storagePath", storagePath)
      const result = await setSongReferenceAudio(formData)

      if (!result.ok) {
        await supabase.storage.from("workspace-files").remove([storagePath])
        setError(describeActionError(result.error))
        return
      }

      if (inputRef.current) inputRef.current.value = ""
      setSuccess("Reference audio attached to this song.")
      router.refresh()
    } catch {
      setError("Upload failed. Check your connection and try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!currentAudioPath || uploading || removing) return
    setRemoving(true)
    setError("")
    setSuccess("")

    try {
      const formData = new FormData()
      formData.set("songId", songId)
      const result = await removeSongReferenceAudio(formData)
      if (!result.ok) {
        setError(describeActionError(result.error))
        return
      }

      setSuccess("Reference audio unlinked. The file remains in Workspace Files.")
      router.refresh()
    } catch {
      setError("The reference audio could not be removed. Please try again.")
    } finally {
      setRemoving(false)
    }
  }

  const isBusy = uploading || removing

  return (
    <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <FileAudio className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Reference audio</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Attach the song's rehearsal or reference recording for your team to practice with. MP3, M4A, or WAV; up to 25 MB.
          </p>
          {currentAudioPath ? (
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Attached track</p>
                <p className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">{currentAudioName || "Song reference audio"}</p>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isBusy}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removing ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Unlink audio
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--muted)]">No reference recording attached yet.</p>
          )}
        </div>
      </div>

      <form onSubmit={handleUpload} className="mt-4 space-y-3">
        <input
          ref={inputRef}
          type="file"
          required
          disabled={isBusy}
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-wav"
          aria-label="Choose a reference audio file"
          className="block w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-soft)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--brand)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {uploading ? "Uploading and attaching…" : currentAudioPath ? "Replace reference audio" : "Upload and attach audio"}
        </button>
      </form>

      <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
        Uploaded recordings also appear in Workspace Files. Unlinking them here does not delete the shared file.
      </p>

      {success ? (
        <p role="status" className="mt-3 flex items-start gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {success}
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-xs text-red-700">{error}</p> : null}
    </section>
  )
}
