"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireWorkspaceAuthorization } from "@/lib/authorization"

const entrySchema = z.object({
  entryType: z.enum(["blockout", "recurring"]),
  title: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).superRefine((entry, ctx) => {
  if (entry.entryType === "blockout") {
    if (!entry.startsOn || !entry.endsOn || entry.endsOn < entry.startsOn) {
      ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Choose a valid date range." })
    }
  } else if (
    !entry.weekdays?.length ||
    !entry.startTime ||
    !entry.endTime ||
    entry.startTime >= entry.endTime
  ) {
    ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Choose days and a valid time range." })
  }
})

export async function createAvailabilityEntry(formData: FormData) {
  const { supabase, userId, organizationId } = await requireWorkspaceAuthorization()
  const entryType = String(formData.get("entryType") ?? "")
  const weekdays = formData.getAll("weekdays").map((value) => Number(value))
  const parsed = entrySchema.safeParse({
    entryType,
    title: String(formData.get("title") ?? "").trim() || undefined,
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    startsOn: String(formData.get("startsOn") ?? "").trim() || undefined,
    endsOn: String(formData.get("endsOn") ?? "").trim() || undefined,
    weekdays,
    startTime: String(formData.get("startTime") ?? "").trim() || undefined,
    endTime: String(formData.get("endTime") ?? "").trim() || undefined,
  })

  if (!parsed.success) redirect("/my-availability?error=invalid_entry")

  const entry = parsed.data
  const { error } = await supabase.from("member_availability").insert({
    organization_id: organizationId,
    user_id: userId,
    entry_type: entry.entryType,
    title: entry.title ?? null,
    reason: entry.reason ?? null,
    starts_on: entry.entryType === "blockout" ? entry.startsOn : null,
    ends_on: entry.entryType === "blockout" ? entry.endsOn : null,
    weekdays: entry.entryType === "recurring" ? entry.weekdays : null,
    start_time: entry.entryType === "recurring" ? entry.startTime : null,
    end_time: entry.entryType === "recurring" ? entry.endTime : null,
    timezone: "Asia/Manila",
  })

  if (error) redirect("/my-availability?error=save_failed")
  revalidatePath("/my-availability")
  revalidatePath("/services")
  redirect("/my-availability?saved=1")
}

export async function deleteAvailabilityEntry(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""))
  if (!id.success) redirect("/my-availability?error=invalid_entry")

  const { supabase, userId, organizationId } = await requireWorkspaceAuthorization()
  const { error } = await supabase
    .from("member_availability")
    .delete()
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)

  if (error) redirect("/my-availability?error=delete_failed")
  revalidatePath("/my-availability")
  revalidatePath("/services")
  redirect("/my-availability?saved=1")
}
