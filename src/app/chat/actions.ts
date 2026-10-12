"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const messageSchema = z.string().trim().min(1).max(2000)

export async function sendTeamChatMessage(
  rawBody: string,
  rawReplyToMessageId?: string | null,
  rawMentionedUserIds?: string[]
) {
  const parsed = messageSchema.safeParse(rawBody)
  const parsedReplyToId = z
    .string()
    .uuid()
    .nullable()
    .safeParse(rawReplyToMessageId ?? null)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Enter a message of up to 2,000 characters.",
    }
  }

  if (!parsedReplyToId.success) {
    return {
      success: false as const,
      error: "The reply target is invalid. Choose a message again.",
    }
  }

  const parsedMentionedIds = z
    .array(z.string().uuid())
    .max(10)
    .safeParse(rawMentionedUserIds ?? [])

  if (!parsedMentionedIds.success) {
    return {
      success: false as const,
      error: "You can mention up to 10 valid team members in one message.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()
  const mentionedUserIds = Array.from(new Set(parsedMentionedIds.data))
    .filter((userId) => userId !== workspace.userId)

  if (mentionedUserIds.length > 0) {
    const { data: mentionedMembers, error: mentionedMembersError } =
      await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", workspace.organizationId)
        .in("user_id", mentionedUserIds)

    if (
      mentionedMembersError ||
      (mentionedMembers ?? []).length !== mentionedUserIds.length
    ) {
      return {
        success: false as const,
        error: "Only members of your current church workspace can be mentioned.",
      }
    }
  }

  if (parsedReplyToId.data) {
    const { data: replyTarget, error: replyTargetError } = await supabase
      .from("team_chat_messages")
      .select("id")
      .eq("id", parsedReplyToId.data)
      .eq("organization_id", workspace.organizationId)
      .maybeSingle()

    if (replyTargetError || !replyTarget) {
      return {
        success: false as const,
        error: "The message you are replying to is no longer available in this workspace.",
      }
    }
  }

  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      organization_id: workspace.organizationId,
      user_id: workspace.userId,
      body: parsed.data,
      reply_to_message_id: parsedReplyToId.data,
      mentioned_user_ids: mentionedUserIds,
    })
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
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



const chatAttachmentMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav",
  "video/mp4", "video/webm",
])

const MAX_CHAT_ATTACHMENT_SIZE = 25 * 1024 * 1024
const MAX_CHAT_ATTACHMENTS = 5

export async function sendTeamChatMessageWithAttachments(formData: FormData) {
  const rawBody = formData.get("body")
  const rawReplyToId = formData.get("replyToMessageId")
  const rawMentionedIds = formData.get("mentionedUserIds")
  const bodyResult = z.string().trim().max(2000).safeParse(
    typeof rawBody === "string" ? rawBody : ""
  )
  const replyResult = z.string().uuid().nullable().safeParse(
    typeof rawReplyToId === "string" && rawReplyToId ? rawReplyToId : null
  )
  let mentionedIdsValue: unknown = []
  if (typeof rawMentionedIds === "string" && rawMentionedIds) {
    try {
      mentionedIdsValue = JSON.parse(rawMentionedIds)
    } catch {
      return { success: false as const, error: "The mentioned team members are invalid." }
    }
  }
  const mentionsResult = z.array(z.string().uuid()).max(10).safeParse(mentionedIdsValue)
  const files = formData.getAll("files").filter(
    (value): value is File => value instanceof File && value.size > 0
  )

  if (!bodyResult.success || !replyResult.success || !mentionsResult.success) {
    return { success: false as const, error: "Check the message, reply, and mentions, then try again." }
  }
  if (files.length > MAX_CHAT_ATTACHMENTS) {
    return { success: false as const, error: "You can attach up to 5 files to one message." }
  }
  if (!bodyResult.data && files.length === 0) {
    return { success: false as const, error: "Write a message or attach a file before sending." }
  }
  for (const file of files) {
    if (file.size > MAX_CHAT_ATTACHMENT_SIZE) {
      return { success: false as const, error: "Each attachment must be 25 MB or smaller." }
    }
    if (!chatAttachmentMimeTypes.has(file.type)) {
      return {
        success: false as const,
        error: `“${file.name}” has a file type that Team Chat does not support.`,
      }
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()
  const mentionedUserIds = Array.from(new Set(mentionsResult.data))
    .filter((userId) => userId !== workspace.userId)

  if (mentionedUserIds.length > 0) {
    const { data: mentionedMembers, error } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", workspace.organizationId)
      .in("user_id", mentionedUserIds)
    if (error || (mentionedMembers ?? []).length !== mentionedUserIds.length) {
      return { success: false as const, error: "Only members of your current church workspace can be mentioned." }
    }
  }

  if (replyResult.data) {
    const { data: replyTarget, error } = await supabase
      .from("team_chat_messages")
      .select("id")
      .eq("id", replyResult.data)
      .eq("organization_id", workspace.organizationId)
      .maybeSingle()
    if (error || !replyTarget) {
      return { success: false as const, error: "The message you are replying to is no longer available in this workspace." }
    }
  }

  const messageId = crypto.randomUUID()
  const attachments: import("./team-chat-client").TeamChatAttachment[] = []
  const uploadedPaths: string[] = []

  for (const file of files) {
    const safeName = file.name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "attachment"
    const path = `${workspace.organizationId}/${workspace.userId}/${messageId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage
      .from("team-chat-files")
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("team-chat-files").remove(uploadedPaths)
      }
      console.error("upload_team_chat_attachment failed:", { code: error.name, message: error.message })
      return { success: false as const, error: `“${file.name}” could not be uploaded. Please try again.` }
    }
    uploadedPaths.push(path)
    attachments.push({ path, name: file.name, type: file.type, size: file.size })
  }

  const messageBody = bodyResult.data || (
    files.length === 1 ? `Shared a file: ${files[0].name}` : `Shared ${files.length} files`
  )
  const { data, error } = await supabase
    .from("team_chat_messages")
    .insert({
      id: messageId,
      organization_id: workspace.organizationId,
      user_id: workspace.userId,
      body: messageBody,
      reply_to_message_id: replyResult.data,
      mentioned_user_ids: mentionedUserIds,
      attachments,
    })
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .single()

  if (error || !data) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("team-chat-files").remove(uploadedPaths)
    }
    console.error("send_team_chat_message_with_attachments failed:", { code: error?.code, message: error?.message })
    return { success: false as const, error: "Your message could not be sent. Please try again." }
  }

  return { success: true as const, message: data }
}

export async function markTeamChatNotificationsRead() {
  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", workspace.userId)
    .eq("organization_id", workspace.organizationId)
    .in("type", ["team_chat_message", "team_chat_mention"])
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
  reply_to_message_id: string | null
  reply_to_user_id: string | null
  reply_to_body: string | null
  pinned_at: string | null
  pinned_by: string | null
  mentioned_user_ids: string[]
  attachments: import("./team-chat-client").TeamChatAttachment[]
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
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
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


const teamChatSearchSchema = z.string().trim().min(1).max(120)

export async function searchTeamChatMessages(rawQuery: string) {
  const parsed = teamChatSearchSchema.safeParse(rawQuery)

  if (!parsed.success) {
    return {
      success: false as const,
      error: "Enter a search term of up to 120 characters.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_chat_messages")
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .eq("organization_id", workspace.organizationId)
    .ilike("body", `%${parsed.data}%`)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("search_team_chat_messages failed:", {
      code: error.code,
      message: error.message,
    })

    return {
      success: false as const,
      error: "Messages could not be searched. Please try again.",
    }
  }

  return {
    success: true as const,
    query: parsed.data,
    messages: (data ?? []) as TeamChatHistoryRow[],
  }
}


const teamChatMessageIdSchema = z.string().uuid()

export async function editTeamChatMessage(
  rawMessageId: string,
  rawBody: string
) {
  const parsedId = teamChatMessageIdSchema.safeParse(rawMessageId)
  const parsedBody = messageSchema.safeParse(rawBody)

  if (!parsedId.success || !parsedBody.success) {
    return {
      success: false as const,
      error: "Enter a valid message of up to 2,000 characters.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_chat_messages")
    .update({ body: parsedBody.data })
    .eq("id", parsedId.data)
    .eq("organization_id", workspace.organizationId)
    .eq("user_id", workspace.userId)
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .maybeSingle()

  if (error || !data) {
    console.error("edit_team_chat_message failed:", {
      code: error?.code,
      message: error?.message,
    })

    return {
      success: false as const,
      error: "This message could not be edited. You can only edit your own messages.",
    }
  }

  return {
    success: true as const,
    message: data,
  }
}

export async function deleteTeamChatMessage(rawMessageId: string) {
  const parsedId = teamChatMessageIdSchema.safeParse(rawMessageId)

  if (!parsedId.success) {
    return {
      success: false as const,
      error: "This message could not be deleted. Refresh the page and try again.",
    }
  }

  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data: messageToDelete } = await supabase
    .from("team_chat_messages")
    .select("id, attachments")
    .eq("id", parsedId.data)
    .eq("organization_id", workspace.organizationId)
    .eq("user_id", workspace.userId)
    .maybeSingle()

  const { data, error } = await supabase
    .from("team_chat_messages")
    .delete()
    .eq("id", parsedId.data)
    .eq("organization_id", workspace.organizationId)
    .eq("user_id", workspace.userId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("delete_team_chat_message failed:", {
      code: error?.code,
      message: error?.message,
    })

    return {
      success: false as const,
      error: "This message could not be deleted. You can only delete your own messages.",
    }
  }

  const attachmentPaths = Array.isArray(messageToDelete?.attachments)
    ? (messageToDelete.attachments as { path?: string }[])
        .map((attachment) => attachment.path)
        .filter((path): path is string => typeof path === "string")
    : []
  if (attachmentPaths.length > 0) {
    const { error: cleanupError } = await supabase.storage
      .from("team-chat-files")
      .remove(attachmentPaths)
    if (cleanupError) {
      console.error("delete_team_chat_attachments_cleanup_failed:", cleanupError.message)
    }
  }

  return { success: true as const, messageId: data.id }
}


const pinnedMessageIdSchema = z.string().uuid()

export async function setTeamChatMessagePinned(
  rawMessageId: string,
  shouldPin: boolean
) {
  const parsedId = pinnedMessageIdSchema.safeParse(rawMessageId)
  const parsedPinned = z.boolean().safeParse(shouldPin)

  if (!parsedId.success || !parsedPinned.success) {
    return {
      success: false as const,
      error: "Choose a valid message and try again.",
    }
  }

  const workspace = await getWorkspace()

  if (!["admin", "worship_leader"].includes(workspace.role)) {
    return {
      success: false as const,
      error: "Only administrators and worship leaders can pin messages.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("set_team_chat_message_pinned", {
    p_message_id: parsedId.data,
    p_pinned: parsedPinned.data,
  })

  const pinnedMessage = Array.isArray(data) ? data[0] : data

  if (error || !pinnedMessage) {
    console.error("set_team_chat_message_pinned failed:", {
      code: error?.code,
      message: error?.message,
    })

    return {
      success: false as const,
      error: "The message could not be pinned. Check permissions and try again.",
    }
  }

  return {
    success: true as const,
    message: pinnedMessage as TeamChatHistoryRow,
  }
}
