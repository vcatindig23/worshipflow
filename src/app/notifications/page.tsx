import Link from "next/link"
import { Bell, CalendarDays, Check } from "lucide-react"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type Notification = {
  id: string
  type: "service_assignment" | "service_assignment_removed"
  title: string
  body: string
  setlist_id: string | null
  read_at: string | null
  created_at: string
}

export default async function NotificationsPage() {
  const workspace = await getWorkspace()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, setlist_id, read_at, created_at")
    .eq("user_id", workspace.userId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("load_notifications failed:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to load your notifications.")
  }

  const notifications = (data ?? []) as Notification[]
  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--brand)]">
              {workspace.organizationName}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">
              Notifications
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Service-team changes and updates for you.
            </p>
          </div>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 self-start rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold transition hover:bg-[var(--surface)]"
              >
                <Check className="size-4" />
                Mark all as read
              </button>
            </form>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
            <Bell className="mx-auto size-8 text-[var(--muted)]" />
            <h2 className="mt-4 text-base font-semibold">
              You&apos;re all caught up
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              New service assignments and changes will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex items-start gap-4 px-5 py-5 sm:px-6 ${
                    notification.read_at ? "" : "bg-[var(--brand-soft)]/35"
                  }`}
                >
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    {notification.type === "service_assignment_removed" ? (
                      <Bell className="size-[18px]" />
                    ) : (
                      <CalendarDays className="size-[18px]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">
                        {notification.title}
                      </h2>
                      {!notification.read_at ? (
                        <span className="size-2 rounded-full bg-[var(--brand)]" aria-label="Unread" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {notification.body}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {new Intl.DateTimeFormat("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(notification.created_at))}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {notification.setlist_id ? (
                        <Link
                          href={`/setlists/${notification.setlist_id}`}
                          className="text-xs font-semibold text-[var(--brand)] hover:underline"
                        >
                          View service
                        </Link>
                      ) : null}
                      {!notification.read_at ? (
                        <form action={markNotificationRead}>
                          <input
                            type="hidden"
                            name="notificationId"
                            value={notification.id}
                          />
                          <button
                            type="submit"
                            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                          >
                            Mark as read
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
