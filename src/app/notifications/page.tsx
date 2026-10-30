import { buttonVariants } from "@/components/ui/button"
import { PageContainer, PageHeader } from "@/components/ui/page"
import Link from "next/link"
import { AtSign, Bell, CalendarDays, Check, MessagesSquare, ArrowLeftRight, Music2 } from "lucide-react"
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

type Notification = {
  id: string
  type:
    | "service_assignment"
    | "service_assignment_removed"
    | "team_chat_message"
    | "team_chat_mention"
    | "service_announcement"
    | "assignment_swap_request"
    | "assignment_swap_status"
    | "service_reminder"
    | "song_edited"
    | "song_review_comment"
    | "song_review_status"
  title: string
  body: string
  setlist_id: string | null
  song_id: string | null
  read_at: string | null
  created_at: string
}

export default async function NotificationsPage() {
  const workspace = await getWorkspace()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, setlist_id, song_id, read_at, created_at")
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
    <PageContainer className="max-w-4xl">
        <PageHeader
          className="border-b border-[var(--border)] pb-6"
          title="Notifications"
          eyebrow={workspace.organizationName}
          description="Team messages, service assignments, and updates for you."
          actions={
            unreadCount > 0 ? (
              <form action={markAllNotificationsRead}>
                <button
                  type="submit"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Check className="size-4" />
                  Mark all as read
                </button>
              </form>
            ) : null
          }
        />

        {notifications.length === 0 ? (
          <div className="wf-card border-dashed px-6 py-14 text-center">
            <Bell className="mx-auto size-8 text-[var(--muted)]" />
            <h2 className="mt-4 text-base font-semibold">
              You&apos;re all caught up
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Song reviews, arrangement updates, service reminders, announcements, team chat, and assignment changes will appear here.
            </p>
          </div>
        ) : (
          <div className="wf-card overflow-hidden">
            <ul className="divide-y divide-[var(--border)]">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`flex items-start gap-4 px-5 py-5 sm:px-6 ${
                    notification.read_at ? "" : "bg-[var(--brand-soft)]/35"
                  }`}
                >
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    {notification.type === "song_edited" || notification.type === "song_review_comment" || notification.type === "song_review_status" ? (
                      <Music2 className="size-[18px]" />
                    ) : notification.type === "team_chat_mention" ? (
                      <AtSign className="size-[18px]" />
                    ) : notification.type === "team_chat_message" ? (
                      <MessagesSquare className="size-[18px]" />
                    ) : notification.type === "assignment_swap_request" || notification.type === "assignment_swap_status" ? (
                      <ArrowLeftRight className="size-[18px]" />
                    ) : notification.type === "service_assignment_removed" || notification.type === "service_announcement" ? (
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
                      {notification.type === "team_chat_message" ||
                      notification.type === "team_chat_mention" ? (
                        <Link
                          href="/chat"
                          className="text-xs font-semibold text-[var(--brand)] hover:underline"
                        >
                          Open team chat
                        </Link>
                      ) : notification.song_id ? (
                        <Link
                          href={`/songs/${notification.song_id}`}
                          className="text-xs font-semibold text-[var(--brand)] hover:underline"
                        >
                          View song
                        </Link>
                      ) : notification.setlist_id ? (
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
    </PageContainer>
  )
}
