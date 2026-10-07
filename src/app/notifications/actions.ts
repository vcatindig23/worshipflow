"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const notificationIdSchema = z.string().uuid()

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  if (error || !data?.claims?.sub) {
    redirect("/login")
  }

  return {
    supabase,
    userId: data.claims.sub,
  }
}

export async function markNotificationRead(formData: FormData) {
  const notificationId = notificationIdSchema.safeParse(
    String(formData.get("notificationId") ?? "")
  )

  if (!notificationId.success) {
    throw new Error("Invalid notification.")
  }

  const { supabase, userId } = await getAuthenticatedUserId()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId.data)
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    console.error("mark_notification_read failed:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to mark the notification as read.")
  }

  revalidatePath("/notifications")
  revalidatePath("/")
}

export async function markAllNotificationsRead() {
  const { supabase, userId } = await getAuthenticatedUserId()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) {
    console.error("mark_all_notifications_read failed:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to mark notifications as read.")
  }

  revalidatePath("/notifications")
  revalidatePath("/")
}
