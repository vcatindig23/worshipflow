import Link from "next/link"
import {
  ArrowDownToLine,
  FileText,
  FolderOpen,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createClient } from "@/lib/supabase/server"
import { deleteWorkspaceFile } from "./actions"
import UploadFileForm from "./upload-file-form"

type FilesPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type StoredFile = {
  name: string
  created_at: string | null
  metadata: {
    size?: number
    mimetype?: string
  } | null
}

type FileCategory =
  | "all"
  | "documents"
  | "images"
  | "audio"

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function readableName(name: string) {
  return name.replace(/^[0-9a-f-]{36}-/i, "")
}

function formatFileSize(bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes)) {
    return "Size unavailable"
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date unavailable"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function getFileCategory(file: StoredFile): Exclude<FileCategory, "all"> | "other" {
  const mimeType = file.metadata?.mimetype?.toLowerCase() ?? ""
  const extension = readableName(file.name)
    .split(".")
    .pop()
    ?.toLowerCase()

  if (
    mimeType.startsWith("audio/") ||
    ["mp3", "m4a", "wav"].includes(extension ?? "")
  ) {
    return "audio"
  }

  if (
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(extension ?? "")
  ) {
    return "images"
  }

  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("presentation") ||
    ["pdf", "doc", "docx", "ppt", "pptx"].includes(extension ?? "")
  ) {
    return "documents"
  }

  return "other"
}

const errors: Record<string, string> = {
  invalid_file: "The selected file is invalid.",
  delete_failed: "The file could not be deleted.",
}

export default async function FilesPage({
  searchParams,
}: FilesPageProps) {
  const [params, workspace] = await Promise.all([
    searchParams,
    getWorkspace(),
  ])
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from("workspace-files")
    .list(workspace.organizationId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    })

  if (error) {
    console.error("Failed to load workspace files:", {
      message: error.message,
      name: error.name,
    })
    throw new Error("Unable to load workspace files.")
  }

  const files = (data ?? []).filter(
    (item) => item.id !== null
  ) as StoredFile[]

  const query = getParam(params.q)?.trim() ?? ""
  const requestedCategory = getParam(params.type)
  const category: FileCategory =
    requestedCategory === "documents" ||
    requestedCategory === "images" ||
    requestedCategory === "audio"
      ? requestedCategory
      : "all"
  const filteredFiles = files.filter((file) => {
    const matchesQuery =
      !query ||
      readableName(file.name)
        .toLowerCase()
        .includes(query.toLowerCase())
    const matchesCategory =
      category === "all" ||
      getFileCategory(file) === category

    return matchesQuery && matchesCategory
  })

  const filesWithLinks = await Promise.all(
    filteredFiles.map(async (file) => {
      const path = `${workspace.organizationId}/${file.name}`
      const { data: signedUrl, error: urlError } =
        await supabase.storage
          .from("workspace-files")
          .createSignedUrl(path, 300)

      if (urlError) {
        throw new Error("Unable to create a file download link.")
      }

      return {
        ...file,
        path,
        signedUrl: signedUrl.signedUrl,
      }
    })
  )

  const canManageFiles = [
    "admin",
    "worship_leader",
    "song_editor",
  ].includes(workspace.role)
  const errorKey = getParam(params.error) ?? ""
  const errorMessage = errors[errorKey]

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
      <section>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <FolderOpen className="size-3.5" />
          Workspace Library
        </span>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
          Files
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Share worship resources with members of {workspace.organizationName}.
          Files are private to your church workspace.
        </p>
      </section>

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {canManageFiles ? (
        <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Upload className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                Upload a resource
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Editors and worship leaders can add files for the team.
              </p>
            </div>
          </div>

          <UploadFileForm
            organizationId={workspace.organizationId}
          />
        </section>
      ) : (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can download shared files. Ask a worship leader or editor
          to upload or remove resources.
        </p>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Shared files
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Showing {filteredFiles.length} of {files.length}{" "}
              {files.length === 1 ? "file" : "files"}
            </p>
          </div>
        </div>

        <form
          action="/files"
          method="get"
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search files..."
              aria-label="Search files"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
            />
          </div>

          <select
            name="type"
            defaultValue={category}
            aria-label="Filter files by type"
            className="h-11 rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm font-medium text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
          >
            <option value="all">All file types</option>
            <option value="documents">Documents</option>
            <option value="images">Images</option>
            <option value="audio">Audio</option>
          </select>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]"
          >
            Apply
          </button>
        </form>

        {files.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <FileText className="size-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">
              No files shared yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Upload sheet music, service documents, images, or rehearsal
              audio to make them available to your team.
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center shadow-sm">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              No matching files
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Try another search term or file type.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
            <ul className="divide-y divide-[var(--border)]">
              {filesWithLinks.map((file) => (
                <li
                  key={file.name}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--brand)]">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {readableName(file.name)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatFileSize(file.metadata?.size)} ·{" "}
                        {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Link
                      href={file.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                    >
                      <ArrowDownToLine className="size-4" />
                      Download
                    </Link>

                    {canManageFiles ? (
                      <form action={deleteWorkspaceFile}>
                        <input
                          type="hidden"
                          name="path"
                          value={file.path}
                        />
                        <button
                          type="submit"
                          aria-label={`Delete ${readableName(file.name)}`}
                          className="flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}
