"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const messageSchema = z.string().trim().min(1).max(2000)

export async function sendTeamChatMessage(rawBody: string) {
  const parsed = messageSchema.safeParse(rawBody)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Enter a message of up to 2,000 characters.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      organization_id: workspace.organizationId,
      user_id: workspace.userId,
      body: parsed.data,
    })
    .select("id, organization_id, user_id, body, created_at")
    .single()

  if (error || !data) {
    console.error("send_team_chat_message failed:", {
      code: error?.code,
      message: error?.message,
    })

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      return {
        success: false as const,
        error: "Team Chat needs its database migration. Apply the new migration and refresh this page.",
      }
    }

    return {
      success: false as const,
      error: "Your message could not be sent. Please try again.",
    }
  }

  return {
    success: true as const,
    message: data,
  }
}


export async function markTeamChatNotificationsRead() {
  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", workspace.userId)
    .eq("organization_id", workspace.organizationId)
    .eq("type", "team_chat_message")
    .is("read_at", null)

  if (error) {
    console.error("mark_team_chat_notifications_read failed:", {
      code: error.code,
      message: error.message,
    })

    return { success: false as const }
  }

  return { success: true as const }
}


const messageCursorSchema = z.string().datetime({ offset: true })

type TeamChatHistoryRow = {
  id: string
  organization_id: string
  user_id: string
  body: string
  created_at: string
}

export async function loadOlderTeamChatMessages(rawBefore: string) {
  const parsed = messageCursorSchema.safeParse(rawBefore)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "The message history cursor is invalid. Refresh the page and try again.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("id, organization_id, user_id, body, created_at")
    .eq("organization_id", workspace.organizationId)
    .lt("created_at", parsed.data)
    .order("created_at", { ascending: false })
    .limit(51)

  if (error) {
    console.error("load_older_team_chat_messages failed:", {
      code: error.code,
      message: error.message,
    })

    return {
      success: false as const,
      error: "Earlier messages could not be loaded. Please try again.",
    }
  }

  const rows = (data ?? []) as TeamChatHistoryRow[]

  return {
    success: true as const,
    messages: rows.slice(0, 50).reverse(),
    hasMore: rows.length > 50,
  }
}
