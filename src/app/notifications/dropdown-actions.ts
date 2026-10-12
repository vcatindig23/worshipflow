"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const notificationIdSchema = z.string().uuid()

type HeaderNotification = {
  id: string
  type: string
  title: string
  body: string
  setlist_id: string | null
  read_at: string | null
  created_at: string
}

type HeaderActivity = {
  id: string
  actor_name: string
  action: string
  entity_type: "song" | "service" | "member"
  entity_id: string | null
  entity_name: string
  details: Record<string, unknown>
  created_at: string
}

async function getHeaderNotificationContext() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    console.error("load_notification_membership failed:", {
      code: membershipError.code,
    })
    throw new Error("Unable to load your notification workspace.")
  }

  if (!membership?.organization_id) {
    redirect("/onboarding")
  }

  return {
    supabase,
    userId,
    organizationId: membership.organization_id,
  }
}

export async function loadNotificationPreview() {
  const { supabase, userId, organizationId } =
    await getHeaderNotificationContext()

  const [recentResult, unreadResult, unreadChatResult, activityResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, setlist_id, read_at, created_at")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .in("type", ["team_chat_message", "team_chat_mention"])
      .is("read_at", null),
    supabase
      .from("organization_activity")
      .select("id, actor_name, action, entity_type, entity_id, entity_name, details, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  if (recentResult.error || unreadResult.error || unreadChatResult.error) {
    console.error("load_notification_preview failed:", {
      code: recentResult.error?.code ?? unreadResult.error?.code ?? unreadChatResult.error?.code,
    })
    return {
      success: false as const,
      error: "Notifications could not be loaded. Please try again.",
    }
  }

  if (activityResult.error) {
    console.error("load_notification_activity failed:", {
      code: activityResult.error.code,
    })
  }

  return {
    success: true as const,
    userId,
    notifications: (recentResult.data ?? []) as HeaderNotification[],
    activities: (activityResult.data ?? []) as HeaderActivity[],
    activityError: activityResult.error
      ? "Workspace activity is temporarily unavailable."
      : "",
    unreadCount: unreadResult.count ?? 0,
    unreadChatCount: unreadChatResult.count ?? 0,
  }
}

export async function markHeaderNotificationRead(rawNotificationId: string) {
  const parsedId = notificationIdSchema.safeParse(rawNotificationId)

  if (!parsedId.success) {
    return {
      success: false as const,
      error: "This notification is invalid.",
    }
  }

  const { supabase, userId, organizationId } =
    await getHeaderNotificationContext()

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .is("read_at", null)

  if (error) {
    console.error("mark_header_notification_read failed:", {
      code: error.code,
    })
    return {
      success: false as const,
      error: "This notification could not be marked as read.",
    }
  }

  return { success: true as const }
}

export async function markHeaderNotificationsRead() {
  const { supabase, userId, organizationId } =
    await getHeaderNotificationContext()

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .is("read_at", null)

  if (error) {
    console.error("mark_header_notifications_read failed:", {
      code: error.code,
    })
    return {
      success: false as const,
      error: "Notifications could not be marked as read.",
    }
  }

  return { success: true as const }
}
