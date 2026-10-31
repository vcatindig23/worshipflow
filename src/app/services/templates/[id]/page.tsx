import type { Metadata } from "next"
import { Feedback } from "@/components/ui/feedback"
import { PageContainer } from "@/components/ui/page"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Layers,
  ListOrdered,
  Music2,
} from "lucide-react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { createServiceFromTemplate } from "../../template-actions"
import DeleteTemplateForm from "./delete-template-form"

type TemplateData = {
  description?: string | null
  service_notes?: string | null
  announcements?: string | null
  songs?: Array<{ song_id: string; section?: string; position?: number }>
  timeline?: Array<{
    position?: number
    item_type?: string
    title?: string
    duration_minutes?: number | null
    notes?: string | null
  }>
}

type TemplateRow = {
  id: string
  name: string
  description: string | null
  template_data: unknown
  created_at: string
  updated_at: string
}

const editorRoles = ["admin", "worship_leader", "song_editor"]

export default async function ServiceTemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, query, workspace] = await Promise.all([
    params,
    searchParams,
    getWorkspace(),
  ])

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_templates")
    .select("id, name, description, template_data, created_at, updated_at")
    .eq("id", id)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (error) {
    redirect("/services/templates?error=migration_missing")
  }

  if (!data) {
    notFound()
  }

  const template = data as TemplateRow
  const snapshot =
    template.template_data && typeof template.template_data === "object"
      ? template.template_data as TemplateData
      : {}
  const songs = Array.isArray(snapshot.songs) ? snapshot.songs : []
  const timeline = Array.isArray(snapshot.timeline) ? snapshot.timeline : []
  const canEdit = editorRoles.includes(workspace.role)

  const errorMessages: Record<string, string> = {
    invalid_name: "Enter a service name between 1 and 200 characters.",
    invalid_date: "Choose a valid service date.",
    invalid_time: "Enter a valid service start time.",
    service_time_migration_missing: "Service start times require the service-time Supabase migration.",
    template_apply_failed: "The service could not be created from this template. No partial service was kept.",
    template_songs_unavailable: "One or more template songs are no longer available in this church workspace.",
    invalid_template_data: "This template contains invalid or mismatched song timeline data.",
    template_delete_failed: "The template could not be deleted.",
  }
  const errorKey = typeof query.error === "string" ? query.error : ""

  return (
    <PageContainer className="max-w-4xl">
      <Link
        href="/services/templates"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        All templates
      </Link>

      {errorKey && errorMessages[errorKey] ? (
        <Feedback tone="error" title="Could not create service from template">
          {errorMessages[errorKey]}
        </Feedback>
      ) : null}

      <section className="wf-card p-6 md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <Layers className="size-3.5" />
          Service Template
        </span>
        <h1 className="wf-page-title mt-3">
          {template.name}
        </h1>
        {template.description ? (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {template.description}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <Music2 className="size-4" />
              Song arrangements
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {songs.length}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <ListOrdered className="size-4" />
              Timeline items
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              {timeline.length}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              <Clock3 className="size-4" />
              Team
            </div>
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              Assign per service
            </p>
          </div>
        </div>
      </section>

      {timeline.length > 0 ? (
        <section className="wf-card p-5">
          <h2 className="font-semibold text-[var(--foreground)]">Saved service flow</h2>
          <ol className="mt-4 space-y-2">
            {timeline.map((item, index) => (
              <li key={String(item.position ?? index) + "-" + String(item.title ?? index)} className="flex items-start gap-3 rounded-xl bg-[var(--surface)] px-3 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    {item.title ?? "Timeline item"}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {(item.item_type ?? "other").replaceAll("_", " ")}
                    {item.duration_minutes ? " · " + item.duration_minutes + " min" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {canEdit ? (
        <section className="wf-card p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Create a service from this template</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              This creates a new draft with the saved songs, arrangements, service notes, announcements, and timeline. Choose the new service date and schedule its team separately.
            </p>
          </div>

          <form action={createServiceFromTemplate} className="space-y-4">
            <input type="hidden" name="templateId" value={template.id} />
            <div>
              <label htmlFor="service-name" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                New service name
              </label>
              <input
                id="service-name"
                name="name"
                required
                maxLength={200}
                defaultValue={template.name}
                placeholder="e.g. Sunday Worship — October 18"
                className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="service-date" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  Service date
                </label>
                <input
                  id="service-date"
                  name="serviceDate"
                  type="date"
                  required
                  className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                />
              </div>
              {workspace.serviceTimeAvailable ? (
                <div>
                  <label htmlFor="service-time" className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                    Start time
                  </label>
                  <input
                    id="service-time"
                    name="serviceTime"
                    type="time"
                    className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>
              ) : (
                <Feedback tone="warning" title="Start times unavailable">
                  Start times become available after the service-time migration is applied.
                </Feedback>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              <CalendarDays className="size-4" />
              Create service
            </button>
          </form>
        </section>
      ) : (
        <p className="rounded-xl bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
          You can view this template, but creating services from it requires a worship leader or editor role.
        </p>
      )}

      {canEdit ? (
        <div className="flex justify-end">
          <DeleteTemplateForm templateId={template.id} templateName={template.name} />
        </div>
      ) : null}
    </PageContainer>
  )
}


export const metadata: Metadata = { title: "Service template" }
