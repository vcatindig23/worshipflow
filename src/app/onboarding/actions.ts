"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const createChurchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional(),
  contactEmail: z
    .string()
    .trim()
    .email()
    .max(320)
    .or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .max(50)
    .optional(),
  address: z
    .string()
    .trim()
    .max(500)
    .optional(),
  website: z
    .string()
    .trim()
    .max(500)
    .optional(),
  defaultServiceName: z
    .string()
    .trim()
    .min(1)
    .max(200),
  defaultServiceDay: z
    .string()
    .regex(/^[0-6]$/),
  defaultServiceTime: z
    .string()
    .regex(
      /^(?:[01]\d|2[0-3]):[0-5]\d$/
    ),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100),
})

export async function createChurch(
  formData: FormData
) {
  const parsed = createChurchSchema.safeParse({
    name: formData.get("name"),
    description:
      formData.get("description") ?? "",
    contactEmail:
      formData.get("contactEmail") ?? "",
    contactPhone:
      formData.get("contactPhone") ?? "",
    address:
      formData.get("address") ?? "",
    website:
      formData.get("website") ?? "",
    defaultServiceName:
      formData.get("defaultServiceName"),
    defaultServiceDay:
      formData.get("defaultServiceDay"),
    defaultServiceTime:
      formData.get("defaultServiceTime"),
    timezone:
      formData.get("timezone"),
  })

  if (!parsed.success) {
    redirect(
      "/onboarding?mode=create&error=invalid_form"
    )
  }

  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId =
    claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const {
    data: existingMembership,
  } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (existingMembership) {
    redirect("/")
  }

  const { data: organizationData, error } =
    await supabase.rpc(
      "create_organization",
      {
        p_name: parsed.data.name,
      }
    )

  if (error) {
    if (
      error.message.includes(
        "AUTHENTICATION_REQUIRED"
      )
    ) {
      redirect("/login")
    }

    redirect(
      "/onboarding?mode=create&error=create_failed"
    )
  }

  const organizationId =
    typeof organizationData === "string"
      ? organizationData
      : null

  if (!organizationId) {
    redirect(
      "/onboarding?mode=create&error=create_failed"
    )
  }

  const { error: updateError } =
    await supabase
      .from("organizations")
      .update({
        description:
          parsed.data.description || null,
        contact_email:
          parsed.data.contactEmail || null,
        contact_phone:
          parsed.data.contactPhone || null,
        address:
          parsed.data.address || null,
        website:
          parsed.data.website || null,
        timezone:
          parsed.data.timezone,
        default_service_name:
          parsed.data.defaultServiceName,
        default_service_day:
          Number(
            parsed.data.defaultServiceDay
          ),
        default_service_time:
          parsed.data.defaultServiceTime,
        onboarding_completed_at:
          new Date().toISOString(),
      })
      .eq("id", organizationId)

  if (updateError) {
    redirect(
      "/onboarding?mode=create&error=details_failed"
    )
  }

  redirect("/")
}