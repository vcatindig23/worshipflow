"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireWorkspaceAuthorization } from "@/lib/authorization"

const validTimezone = z.string().trim().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}, "Choose a valid time zone.")

const entrySchema = z.object({
  entryType: z.enum(["blockout", "recurring"]),
  title: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timezone: validTimezone,
}).superRefine((entry, ctx) => {
  if (entry.entryType === "blockout") {
    if (!entry.startsOn || !entry.endsOn || entry.endsOn < entry.startsOn) {
      ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Choose a valid date range." })
    }
    if (entry.startsOn && entry.endsOn && entry.endsOn >= entry.startsOn) {
      const start = new Date(`${entry.startsOn}T00:00:00Z`)
      const end = new Date(`${entry.endsOn}T00:00:00Z`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ||
          start.toISOString().slice(0, 10) !== entry.startsOn ||
          end.toISOString().slice(0, 10) !== entry.endsOn) {
        ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Choose real calendar dates." })
      }
    }
  } else {
    if (!entry.weekdays?.length || new Set(entry.weekdays).size !== entry.weekdays.length) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Choose at least one day." })
    }
    if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Choose a valid time range." })
    }
  }
})

function parseCalendarReturnDate(value: string) {
  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(value)
  if (!parsed.success) return undefined

  const date = new Date(`${parsed.data}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === parsed.data
    ? parsed.data
    : undefined
}

function availabilityRedirect(
  status: "saved" | "invalid_entry" | "save_failed" | "delete_failed",
  calendarDate?: string,
  calendarPeriod?: "past" | "all"
): never {
  const key = status === "saved" ? "availabilitySaved" : "availabilityError"
  const parameters = new URLSearchParams({
    [key]: status === "saved" ? "1" : status,
  })

  if (calendarDate) {
    parameters.set("date", calendarDate)
    parameters.set("view", "calendar")
    if (calendarPeriod) parameters.set("period", calendarPeriod)
  }

  redirect(`/my-schedule?${parameters.toString()}`)
}

export async function createAvailabilityEntry(formData: FormData) {
  const calendarDate = formData.get("calendarView") === "1"
    ? parseCalendarReturnDate(String(formData.get("calendarDate") ?? ""))
    : undefined
  const requestedPeriod = String(formData.get("calendarPeriod") ?? "")
  const calendarPeriod = requestedPeriod === "past" || requestedPeriod === "all"
    ? requestedPeriod
    : undefined

  const { supabase, userId, organizationId } = await requireWorkspaceAuthorization()
  const weekdays = formData.getAll("weekdays").map((value) => Number(value))
  const parsed = entrySchema.safeParse({
    entryType: String(formData.get("entryType") ?? ""),
    title: String(formData.get("title") ?? "").trim() || undefined,
    reason: String(formData.get("reason") ?? "").trim() || undefined,
    startsOn: String(formData.get("startsOn") ?? "").trim() || undefined,
    endsOn: String(formData.get("endsOn") ?? "").trim() || undefined,
    weekdays,
    startTime: String(formData.get("startTime") ?? "").trim() || undefined,
    endTime: String(formData.get("endTime") ?? "").trim() || undefined,
    timezone: String(formData.get("timezone") ?? "Asia/Manila").trim(),
  })

  if (!parsed.success) return availabilityRedirect("invalid_entry", calendarDate, calendarPeriod)

  const entry = parsed.data
  const { error } = await supabase.from("member_availability").insert({
    organization_id: organizationId,
    user_id: userId,
    entry_type: entry.entryType,
    title: entry.title || null,
    reason: entry.reason || null,
    starts_on: entry.entryType === "blockout" ? entry.startsOn : null,
    ends_on: entry.entryType === "blockout" ? entry.endsOn : null,
    weekdays: entry.entryType === "recurring" ? entry.weekdays : null,
    start_time: entry.entryType === "recurring" ? entry.startTime : null,
    end_time: entry.entryType === "recurring" ? entry.endTime : null,
    timezone: entry.timezone,
  })

  if (error) availabilityRedirect("save_failed", calendarDate, calendarPeriod)
  revalidatePath("/my-schedule")
  revalidatePath("/services")
  availabilityRedirect("saved", calendarDate, calendarPeriod)
}

export async function deleteAvailabilityEntry(formData: FormData) {
  const id = z.string().uuid().safeParse(String(formData.get("id") ?? ""))
  if (!id.success) availabilityRedirect("invalid_entry")

  const { supabase, userId, organizationId } = await requireWorkspaceAuthorization()
  const { error } = await supabase
    .from("member_availability")
    .delete()
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .eq("user_id", userId)

  if (error) availabilityRedirect("delete_failed")
  revalidatePath("/my-schedule")
  revalidatePath("/services")
  availabilityRedirect("saved")
}
