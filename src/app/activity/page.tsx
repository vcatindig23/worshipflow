import Link from "next/link"
import { Activity, CalendarDays, Music2, Users } from "lucide-react"
import { describeActivity, type ActivityEntry } from "@/lib/activity-log"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type ActivityRow = ActivityEntry & {
  id: string
  entity_type: "song" | "service" | "member"
  entity_id: string | null
  created_at: string
}

function activityHref(activity: ActivityRow) {
  if (
    !activity.entity_id ||
    activity.action === "song.deleted" ||
    activity.action === "service.deleted"
  ) {
    return null
  }

  if (activity.entity_type === "song") {
    return `/songs/${activity.entity_id}`
  }

  if (activity.entity_type === "service") {
    return `/setlists/${activity.entity_id}`
  }

  return "/settings/team"
}

function ActivityIcon({ type }: { type: ActivityRow["entity_type"] }) {
  const Icon =
    type === "song" ? Music2 : type === "service" ? CalendarDays : Users

  return <Icon className="size-[18px]" />
}

export default async function ActivityPage() {
  const workspace = await getWorkspace()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organization_activity")
    .select(
      "id, actor_name, action, entity_type, entity_id, entity_name, details, created_at"
    )
    .eq("organization_id", workspace.organizationId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("load_organization_activity failed:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to load workspace activity.")
  }

  const entries = (data ?? []) as ActivityRow[]

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="border-b border-[var(--border)] pb-6">
          <p className="text-sm font-medium text-[var(--brand)]">
            {workspace.organizationName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
            Activity
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Recent changes across your songs, services, and team.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
            <Activity className="mx-auto size-8 text-[var(--muted)]" />
            <h2 className="mt-4 text-base font-semibold">
              No activity yet
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Changes made in your workspace will appear here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Return to dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <ol className="divide-y divide-[var(--border)]">
              {entries.map((entry) => {
                const href = activityHref(entry)
                const content = (
                  <>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <ActivityIcon type={entry.entity_type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-6">
                        {describeActivity(entry)}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        by {entry.actor_name}
                        {" · "}
                        <time dateTime={entry.created_at}>
                          {new Intl.DateTimeFormat("en-PH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: workspace.organizationTimezone,
                          }).format(new Date(entry.created_at))}
                        </time>
                      </span>
                    </span>
                  </>
                )

                return (
                  <li key={entry.id}>
                    {href ? (
                      <Link
                        href={href}
                        className="flex items-start gap-4 px-5 py-5 transition hover:bg-[var(--surface)] sm:px-6"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
                        {content}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </main>
  )
}
