import Link from "next/link"
import { FileText, Link2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { addServiceResource, removeServiceResource } from "./service-resources-actions"

type ServiceResource = {
  id: string
  storage_path: string
  display_name: string
  created_at: string
}

type StoredFile = {
  name: string
  created_at: string | null
  metadata: {
    size?: number
    mimetype?: string
  } | null
}

function readableName(name: string) {
  return name.replace(/^[0-9a-f-]{36}-/i, "")
}

function formatFileSize(bytes: number | undefined) {
  if (bytes === undefined || !Number.isFinite(bytes)) {
    return ""
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export default async function ServiceResources({
  setlistId,
  canEdit,
}: {
  setlistId: string
  canEdit: boolean
}) {
  const workspace = await getWorkspace()

  if (!workspace) {
    return null
  }

  const supabase = await createClient()

  const [{ data: resources }, { data: files }] =
    await Promise.all([
      supabase
        .from("setlist_resources")
        .select("id, storage_path, display_name, created_at")
        .eq("setlist_id", setlistId)
        .eq("organization_id", workspace.organizationId)
        .order("created_at", { ascending: false }),
      supabase.storage
        .from("workspace-files")
        .list(workspace.organizationId, {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        }),
    ])

  const serviceResources =
    (resources ?? []) as ServiceResource[]
  const storedFiles =
    (files ?? []).filter((file) => file.id !== null) as StoredFile[]
  const linkedPaths = new Set(
    serviceResources.map((resource) => resource.storage_path)
  )

  const filesWithLinks = await Promise.all(
    serviceResources.map(async (resource) => {
      const { data, error } = await supabase.storage
        .from("workspace-files")
        .createSignedUrl(resource.storage_path, 300)

      if (error || !data?.signedUrl) {
        return null
      }

      const fileName =
        resource.storage_path.split("/").pop() ?? ""
      const storedFile = storedFiles.find(
        (file) => file.name === fileName
      )

      return {
        ...resource,
        signedUrl: data.signedUrl,
        size: storedFile?.metadata?.size,
      }
    })
  )

  const visibleResources =
    filesWithLinks.filter(
      (resource): resource is NonNullable<typeof resource> =>
        resource !== null
    )

  const availableFiles = storedFiles.filter(
    (file) =>
      !linkedPaths.has(
        `${workspace.organizationId}/${file.name}`
      )
  )

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Link2 className="size-4 text-[var(--brand)]" />
        <h2 className="font-semibold text-[var(--foreground)]">
          Service Resources
        </h2>
      </div>

      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        Link rehearsal audio, documents, charts, and other files from the
        workspace library to this service.
      </p>

      {visibleResources.length > 0 ? (
        <ul className="mt-4 divide-y divide-[var(--border)]">
          {visibleResources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-center gap-3 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <FileText className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">
                  {resource.display_name}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {resource.size
                    ? `${formatFileSize(resource.size)} · `
                    : ""}
                  Added {formatDate(resource.created_at)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={resource.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                >
                  Open
                </Link>

                {canEdit ? (
                  <form action={removeServiceResource}>
                    <input
                      type="hidden"
                      name="setlistId"
                      value={setlistId}
                    />
                    <input
                      type="hidden"
                      name="resourceId"
                      value={resource.id}
                    />
                    <button
                      type="submit"
                      aria-label={`Remove ${resource.display_name} from service`}
                      className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-2xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
          No resources are linked to this service yet.
        </div>
      )}

      {canEdit ? (
        <form
          action={addServiceResource}
          className="mt-4 space-y-3 border-t border-[var(--border)] pt-4"
        >
          <input
            type="hidden"
            name="setlistId"
            value={setlistId}
          />

          <div>
            <label
              htmlFor={`resource-file-${setlistId}`}
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Workspace file
            </label>
            <select
              id={`resource-file-${setlistId}`}
              name="storagePath"
              required
              defaultValue=""
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              <option value="" disabled>
                Select a file
              </option>
              {availableFiles.map((file) => (
                <option
                  key={file.name}
                  value={`${workspace.organizationId}/${file.name}`}
                >
                  {readableName(file.name)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`resource-name-${setlistId}`}
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              Display name
            </label>
            <input
              id={`resource-name-${setlistId}`}
              name="displayName"
              maxLength={120}
              required
              placeholder="e.g. Rehearsal audio or service guide"
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>

          <button
            type="submit"
            disabled={availableFiles.length === 0}
            className="h-10 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Link to Service
          </button>

          {storedFiles.length === 0 ? (
            <p className="text-xs leading-5 text-[var(--muted)]">
              Upload files in the Workspace Library first, then return here to
              link them to this service.
            </p>
          ) : availableFiles.length === 0 ? (
            <p className="text-xs leading-5 text-[var(--muted)]">
              All workspace files are already linked to this service.
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}
