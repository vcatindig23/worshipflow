import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { requireWorkspaceAuthorization } from "@/lib/authorization"
import { PageContainer, PageHeader } from "@/components/ui/page"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Feedback } from "@/components/ui/feedback"
import { Pagination } from "@/components/ui/pagination"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = { title: "Permission history" }

type Entry = {
  id: string
  actor_id: string | null
  target_id: string | null
  action: string
  before_values: {
    role?: string
    status?: string
    team_positions?: string[]
  } | null
  after_values: {
    role?: string
    status?: string
    team_positions?: string[]
  } | null
  created_at: string
}
function describeValues(value: Entry["before_values"]) {
  if (!value) return "—"
  return (
    [
      value.role?.replaceAll("_", " "),
      value.status,
      value.team_positions?.join(", "),
    ]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}
export default async function PermissionHistory({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { supabase, organizationId, userId } =
    await requireWorkspaceAuthorization("audit:read")
  const params = await searchParams
  const requested = Number(params.page ?? 1)
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(requested, 10000)
      : 1
  const size = 25
  const { data, count, error } = await supabase
    .from("permission_audit_log")
    .select(
      "id, actor_id, target_id, action, before_values, after_values, created_at",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * size, page * size - 1)
  const entries = (data ?? []) as Entry[]
  const pages = Math.max(1, Math.ceil((count ?? 0) / size))
  return (
    <PageContainer>
      <PageHeader
        title="Permission history"
        eyebrow="Administration"
        description="Review membership, role, worship-position, and invitation changes. Only your church administrators can read this history."
        actions={
          <Link
            href="/settings/team"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft className="size-4" />
            Back to team
          </Link>
        }
      />
      {error ? (
        <Feedback
          tone="error"
          title="Permission history could not be loaded"
          actions={
            <Link
              href="/settings/team/audit"
              className={buttonVariants({ variant: "outline" })}
            >
              Try again
            </Link>
          }
        >
          Check your connection and try again.
        </Feedback>
      ) : entries.length === 0 ? (
        <EmptyState
          title={
            page > 1
              ? "No history on this page"
              : "No permission changes recorded yet"
          }
          description="Changes made after audit logging was enabled will appear here. Earlier changes may still be available in workspace activity."
          icon={<ShieldCheck className="size-5" />}
          actions={
            page > 1 ? (
              <Link
                href="/settings/team/audit"
                className={buttonVariants({ variant: "outline" })}
              >
                First page
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">
              Append-only permission changes for this church workspace
            </caption>
            <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--muted)]">
              <tr>
                {[
                  "When (Asia/Manila)",
                  "Change",
                  "Actor",
                  "Target",
                  "Before",
                  "After",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-3 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap px-4 py-4">
                    <time dateTime={entry.created_at}>
                      {new Intl.DateTimeFormat("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Manila",
                      }).format(new Date(entry.created_at))}
                    </time>
                  </td>
                  <td className="px-4 py-4 font-medium">
                    {entry.action.replaceAll("_", " ").replace(".", ": ")}
                  </td>
                  <td className="px-4 py-4" title={entry.actor_id ?? undefined}>
                    {entry.actor_id === userId
                      ? "You"
                      : (entry.actor_id?.slice(0, 8) ?? "System")}
                  </td>
                  <td
                    className="px-4 py-4 font-mono text-xs"
                    title={entry.target_id ?? undefined}
                  >
                    {entry.target_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {describeValues(entry.before_values)}
                  </td>
                  <td className="px-4 py-4">
                    {describeValues(entry.after_values)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {!error && pages > 1 ? (
        <Pagination
          label="Permission history pages"
          summary={
            <>
              Page {page} of {pages} · {count} changes
            </>
          }
          previousHref={
            page > 1 ? `/settings/team/audit?page=${page - 1}` : undefined
          }
          nextHref={
            page < pages ? `/settings/team/audit?page=${page + 1}` : undefined
          }
        />
      ) : null}
    </PageContainer>
  )
}
