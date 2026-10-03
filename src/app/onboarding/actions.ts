"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const organizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(120),
  description: z
    .string()
    .trim()
    .max(1000),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .max(50),
  address: z
    .string()
    .trim()
    .max(500),
  website: z
    .string()
    .trim()
    .url()
    .max(500)
    .or(z.literal("")),
  defaultServiceName: z
    .string()
    .trim()
    .min(1)
    .max(120),
  defaultServiceDay: z.coerce
    .number()
    .int()
    .min(0)
    .max(6),
  defaultServiceTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100),
})

export async function createOrganization(formData: FormData) {
  const result = organizationSchema.safeParse({
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
    redirect("/onboarding?error=invalid_details")
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: existingMembership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

  if (membershipError) {
    redirect("/onboarding?error=membership_check_failed")
  }

  if (existingMembership) {
    redirect("/")
  }

  const { data: organizationId, error: createError } =
    await supabase.rpc("create_organization", {
      p_name: result.data.name,
    })

  if (createError || !organizationId) {
    redirect("/onboarding?error=create_failed")
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      description: result.data.description || null,
      contact_email: result.data.contactEmail || null,
      contact_phone: result.data.contactPhone || null,
      address: result.data.address || null,
      website: result.data.website || null,
      timezone: result.data.timezone,
      default_service_name: result.data.defaultServiceName,
      default_service_day: result.data.defaultServiceDay,
      default_service_time: result.data.defaultServiceTime,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", organizationId)

  if (updateError) {
    redirect("/onboarding?error=setup_failed")
  }

  redirect("/")
}