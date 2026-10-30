import { EmptyState } from "@/components/ui/empty-state"
import { Feedback } from "@/components/ui/feedback"
import { buttonVariants } from "@/components/ui/button"
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button"
import { Input, Select } from "@/components/ui/form-controls"
import { PageContainer, PageHeader } from "@/components/ui/page"
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
  }

  const storageErrorMessage = error
    ? error.message.toLowerCase().includes("bucket not found")
      ? "The workspace file bucket is missing. Apply the workspace-files database migration to enable uploads and downloads."
      : "The shared file library could not be loaded. Check the Supabase Storage configuration and try again."
    : ""

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
    <PageContainer>
      <PageHeader
        title={<>Files</>}
        eyebrow={<><FolderOpen className="size-3.5" />
          Workspace Library</>}
        description={<>Share worship resources with members of {workspace.organizationName}.
          Files are private to your church workspace.</>}
      />

      {errorMessage ? (
        <Feedback tone="error" title="File action could not be completed">{errorMessage} Check your connection and try again.</Feedback>
      ) : null}

      {storageErrorMessage ? (
        <Feedback tone="warning" title="Shared file library unavailable">
          {storageErrorMessage}
        </Feedback>
      ) : null}

      {canManageFiles ? (
        <section className="wf-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Upload className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                Upload resources
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Drag and drop files or browse your device. Each file can be up to 25 MB.
              </p>
            </div>
          </div>

          <UploadFileForm
            organizationId={workspace.organizationId}
          />
        </section>
      ) : (
        <Feedback tone="info" title="Read-only file access">
          You can download shared files. Ask a worship leader or editor
          to upload or remove resources.
        </Feedback>
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
          className="wf-card mb-4 flex flex-col gap-3 p-4 shadow-sm sm:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search files..."
              aria-label="Search files"
              className="w-full pl-10 pr-4"
            />
          </div>

          <Select
            name="type"
            defaultValue={category}
            aria-label="Filter files by type"
            className="px-3.5 font-medium text-[var(--foreground)] sm:w-auto"
          >
            <option value="all">All file types</option>
            <option value="documents">Documents</option>
            <option value="images">Images</option>
            <option value="audio">Audio</option>
          </Select>

          <button
            type="submit"
            className={buttonVariants({ variant: "secondary", className: "h-11 px-5" })}
          >
            Apply
          </button>
        </form>

        {storageErrorMessage ? null : files.length === 0 ? (
          <EmptyState title="No files shared yet" description="Upload sheet music, service documents, images, or rehearsal audio to share them with your team." icon={<FileText className="size-5" />} />
        ) : filteredFiles.length === 0 ? (
          <EmptyState title="No matching files" description="Try another search term or file type, or clear your filters." icon={<Search className="size-5" />} actions={<Link href="/files" className={buttonVariants({ variant: "outline" })}>Clear filters</Link>} />
        ) : (
          <div className="wf-card overflow-hidden">
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
                      className={buttonVariants({ variant: "outline" })}
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
                        <ConfirmSubmitButton title="Delete this file?" description="This permanently removes the shared file from your workspace. Download a copy first if you need to keep it." confirmLabel="Delete file"
                          type="submit"
                          aria-label={`Delete ${readableName(file.name)}`}
                          className="flex size-9 items-center justify-center rounded-lg border border-[var(--danger)]/25 bg-[var(--card)] text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
                        >
                          <Trash2 className="size-4" />
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageContainer>
  )
}
