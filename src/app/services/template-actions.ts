"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import {
  isValidServiceDate,
  isValidServiceTime,
} from "@/lib/service-scheduling"

const editorRoles = ["admin", "worship_leader", "song_editor"] as const
const uuidSchema = z.string().uuid()
const timelineTypeSchema = z.enum([
  "opening",
  "welcome",
  "song",
  "prayer",
  "offering",
  "announcements",
  "message",
  "communion",
  "closing",
  "transition",
  "other",
])

const templateSongSchema = z.object({
  song_id: uuidSchema,
  position: z.number().int().min(1),
  section: z.string().trim().min(1).max(80),
  key_override: z.string().max(12).nullable().optional(),
  capo_override: z.number().int().min(0).max(12).nullable().optional(),
  tempo_override: z.number().int().min(20).max(300).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

const templateTimelineSchema = z.object({
  position: z.number().int().min(0),
  item_type: timelineTypeSchema,
  title: z.string().trim().min(1).max(160),
  duration_minutes: z.number().int().min(1).max(240).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  song_id: uuidSchema.nullable().optional(),
})

const templateDataSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  service_notes: z.string().max(3000).nullable().optional(),
  announcements: z.string().max(3000).nullable().optional(),
  songs: z.array(templateSongSchema).max(200),
  timeline: z.array(templateTimelineSchema).max(200),
})

async function getTemplateContext() {
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  return {
    workspace,
    supabase: await createClient(),
  }
}

function requireTemplateEditor(role: string) {
  if (!editorRoles.includes(role as (typeof editorRoles)[number])) {
    redirect("/error?code=permission_denied")
  }
}

function redirectServiceError(setlistId: string, code: string): never {
  redirect("/setlists/" + setlistId + "?error=" + code)
}

export async function saveServiceAsTemplate(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const templateName = String(formData.get("templateName") ?? "").trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/services")
  }

  if (templateName.length < 1 || templateName.length > 120) {
    redirectServiceError(setlistId, "template_name_invalid")
  }

  const { workspace, supabase } = await getTemplateContext()
  requireTemplateEditor(workspace.role)

  const { data: service, error: serviceError } = await supabase
    .from("setlists")
    .select("id, name, description, service_notes, announcements")
    .eq("id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (serviceError || !service) {
    redirectServiceError(setlistId, "template_save_failed")
  }

  const [songsResult, timelineResult] = await Promise.all([
    supabase
      .from("setlist_songs")
      .select("song_id, position, section, key_override, capo_override, tempo_override, notes")
      .eq("setlist_id", setlistId)
      .order("position", { ascending: true }),
    supabase
      .from("setlist_timeline_items")
      .select("position, item_type, title, duration_minutes, notes, song_id")
      .eq("setlist_id", setlistId)
      .eq("organization_id", workspace.organizationId)
      .order("position", { ascending: true }),
  ])

  if (songsResult.error || timelineResult.error) {
    redirectServiceError(setlistId, "template_save_failed")
  }

  const templateData = {
    description: service.description,
    service_notes: service.service_notes,
    announcements: service.announcements,
    songs: songsResult.data ?? [],
    timeline: timelineResult.data ?? [],
  }

  const parsedData = templateDataSchema.safeParse(templateData)

  if (!parsedData.success) {
    redirectServiceError(setlistId, "template_save_failed")
  }

  const { error: insertError } = await supabase
    .from("service_templates")
    .insert({
      organization_id: workspace.organizationId,
      name: templateName,
      description: service.description,
      template_data: parsedData.data,
      created_by: workspace.userId,
      updated_by: workspace.userId,
    })

  if (insertError) {
    console.error("save_service_template failed:", {
      code: insertError.code,
    })
    redirectServiceError(setlistId, "template_save_failed")
  }

  revalidatePath("/services")
  revalidatePath("/services/templates")
  redirect("/services/templates?created=1")
}

export async function createServiceFromTemplate(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const serviceDate = String(formData.get("serviceDate") ?? "").trim()
  const serviceTime = String(formData.get("serviceTime") ?? "").trim()

  if (!uuidSchema.safeParse(templateId).success) {
    redirect("/services/templates")
  }

  if (name.length < 1 || name.length > 200) {
    redirect("/services/templates/" + templateId + "?error=invalid_name")
  }

  if (!isValidServiceDate(serviceDate)) {
    redirect("/services/templates/" + templateId + "?error=invalid_date")
  }

  if (serviceTime && !isValidServiceTime(serviceTime)) {
    redirect("/services/templates/" + templateId + "?error=invalid_time")
  }

  const { workspace, supabase } = await getTemplateContext()
  requireTemplateEditor(workspace.role)

  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)
  if (serviceTime && !serviceTimeAvailable) {
    redirect("/services/templates/" + templateId + "?error=service_time_migration_missing")
  }

  const { data: template, error: templateError } = await supabase
    .from("service_templates")
    .select("id, name, template_data")
    .eq("id", templateId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (templateError || !template) {
    redirect("/services/templates?error=migration_missing")
  }

  const parsedData = templateDataSchema.safeParse(template.template_data)

  if (!parsedData.success) {
    redirect("/services/templates/" + templateId + "?error=invalid_template_data")
  }

  const templateData = parsedData.data
  const songIds = Array.from(new Set(templateData.songs.map((song) => song.song_id)))

  if (templateData.timeline.some((item) => item.song_id && !songIds.includes(item.song_id))) {
    redirect("/services/templates/" + templateId + "?error=invalid_template_data")
  }

  if (songIds.length > 0) {
    const { data: availableSongs, error: availableSongsError } = await supabase
      .from("songs")
      .select("id")
      .eq("organization_id", workspace.organizationId)
      .in("id", songIds)

    if (
      availableSongsError ||
      (availableSongs ?? []).length !== songIds.length
    ) {
      redirect("/services/templates/" + templateId + "?error=template_songs_unavailable")
    }
  }

  const { data: serviceId, error: createError } = await supabase.rpc(
    "create_service_from_template",
    {
      p_template_id: templateId,
      p_name: name,
      p_service_date: serviceDate,
      p_service_time:
        serviceTimeAvailable && serviceTime
          ? serviceTime + ":00"
          : null,
    }
  )

  if (createError || !serviceId) {
    console.error("create_service_from_template failed:", {
      code: createError?.code,
    })
    redirect("/services/templates/" + templateId + "?error=template_apply_failed")
  }

  revalidatePath("/services")
  revalidatePath("/services/templates")
  revalidatePath("/setlists")
  redirect("/setlists/" + serviceId)
}

export async function deleteServiceTemplate(formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "").trim()

  if (!uuidSchema.safeParse(templateId).success) {
    redirect("/services/templates")
  }

  const { workspace, supabase } = await getTemplateContext()
  requireTemplateEditor(workspace.role)

  const { error } = await supabase
    .from("service_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", workspace.organizationId)

  if (error) {
    redirect("/services/templates/" + templateId + "?error=template_delete_failed")
  }

  revalidatePath("/services/templates")
  redirect("/services/templates?deleted=1")
}
