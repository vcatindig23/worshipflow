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
