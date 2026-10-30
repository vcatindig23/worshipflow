import { buttonVariants } from "@/components/ui/button"
import { Feedback } from "@/components/ui/feedback"
import { PageContainer, PageHeader } from "@/components/ui/page"
import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Copy,
  Layers,
  ListOrdered,
  Music2,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type TemplateRow = {
  id: string
  name: string
  description: string | null
  template_data: unknown
  created_at: string
  updated_at: string
}

function getCounts(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { songs: 0, timeline: 0 }
  }

  const snapshot = value as Record<string, unknown>
  return {
    songs: Array.isArray(snapshot.songs) ? snapshot.songs.length : 0,
    timeline: Array.isArray(snapshot.timeline) ? snapshot.timeline.length : 0,
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export default async function ServiceTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [workspace, params] = await Promise.all([
    getWorkspace(),
    searchParams,
  ])

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("service_templates")
    .select("id, name, description, template_data, created_at, updated_at")
    .eq("organization_id", workspace.organizationId)
    .order("updated_at", { ascending: false })

  const templates = (data ?? []) as TemplateRow[]
  const canEdit = ["admin", "worship_leader", "song_editor"].includes(
    workspace.role
  )
  const notice =
    typeof params.created === "string"
      ? "Service template saved."
      : typeof params.deleted === "string"
        ? "Service template deleted."
        : ""

  return (
    <PageContainer className="max-w-6xl">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        <Layers className="size-4" />
        Back to Services
      </Link>

      <PageHeader
        title={<>Service Templates</>}
        eyebrow={<><Layers className="size-3.5" />
            Service Planning</>}
        description={<>Reuse your church&apos;s usual service flow, song arrangements, and notes instead of rebuilding every plan from scratch.</>}
        actions={<>
<Link
          href="/services"
          className={buttonVariants({ variant: "outline" })}
        >
          <CalendarDays className="size-4" />
          View Services
        </Link>
        </>}
      />

      {notice ? (
        <Feedback tone="success" title="Template updated">
          {notice}
        </Feedback>
      ) : null}

      {typeof params.error === "string" ? (
        <Feedback
          tone={params.error === "migration_missing" ? "warning" : "error"}
          title={
            params.error === "migration_missing"
              ? "Service Templates need a database migration"
              : "Template action could not be completed"
          }
          actions={
            params.error === "migration_missing" ? (
              <a
                href="https://github.com/vcatindig23/worshipflow/blob/main/supabase/migrations/20261012150000_service_templates.sql"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                View migration
              </a>
            ) : undefined
          }
        >
          {params.error === "migration_missing"
            ? "Apply 20261012150000_service_templates.sql, then refresh this page."
            : "Please try the requested template action again."}
        </Feedback>
      ) : null}

      {error ? (
        <Feedback
          tone="warning"
          title="Templates database setup required"
          actions={
            <a
              href="https://github.com/vcatindig23/worshipflow/blob/main/supabase/migrations/20261012150000_service_templates.sql"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-4"
            >
              Open the migration in GitHub
            </a>
          }
        >
          The service-template table is not available yet. Apply the new Supabase migration before using this feature.
        </Feedback>
      ) : templates.length === 0 ? (
        <section className="wf-card border-dashed px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Copy className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
            No service templates yet
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">
            Open one of your service plans and choose Save template. Its song order, arrangement details, service notes, announcements, and timeline will be saved here. Team assignments remain specific to each service.
          </p>
          <Link
            href="/services"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            Choose a service plan
            <ArrowRight className="size-4" />
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const counts = getCounts(template.template_data)
            return (
              <Link
                key={template.id}
                href={"/services/templates/" + template.id}
                className="wf-card wf-card-interactive group p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Layers className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                      {template.name}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Updated {formatDate(template.updated_at)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
                </div>

                {template.description ? (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                    {template.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[var(--muted)]">
                    Reusable worship service plan
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    <Music2 className="size-3.5" />
                    {counts.songs} {counts.songs === 1 ? "song" : "songs"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    <ListOrdered className="size-3.5" />
                    {counts.timeline} timeline items
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
                    <Clock3 className="size-3.5" />
                    Team assigned per service
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      )}

      {!canEdit ? (
        <p className="text-xs text-[var(--muted)]">
          You can view templates, but creating services from templates requires a worship leader or editor role.
        </p>
      ) : null}
    </PageContainer>
  )
}
