"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .or(z.literal("")),
  contactPhone: z.string().trim().max(50),
  address: z.string().trim().max(500),
  website: z.string().trim().url().max(500).or(z.literal("")),
  defaultServiceName: z.string().trim().min(1).max(120),
  defaultServiceDay: z.coerce.number().int().min(0).max(6),
  defaultServiceTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(1).max(100),
})

export async function updateChurchSettings(formData: FormData) {
  const result = settingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    address: formData.get("address") ?? "",
    website: formData.get("website") ?? "",
    defaultServiceName: formData.get("defaultServiceName"),
    defaultServiceDay: formData.get("defaultServiceDay"),
    defaultServiceTime: formData.get("defaultServiceTime"),
    timezone: formData.get("timezone"),
  })

  if (!result.success) {
    redirect("/settings/church?error=invalid_details")
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    redirect("/settings/church?error=membership_failed")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  if (membership.role !== "admin") {
    redirect("/settings/church?error=not_authorized")
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: result.data.name,
      description: result.data.description || null,
      contact_email: result.data.contactEmail || null,
      contact_phone: result.data.contactPhone || null,
      address: result.data.address || null,
      website: result.data.website || null,
      timezone: result.data.timezone,
      default_service_name: result.data.defaultServiceName,
      default_service_day: result.data.defaultServiceDay,
      default_service_time: result.data.defaultServiceTime,
    })
    .eq("id", membership.organization_id)

  if (error) {
    redirect("/settings/church?error=update_failed")
  }

  redirect("/settings/church?saved=true")
}