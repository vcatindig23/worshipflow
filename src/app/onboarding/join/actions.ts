"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { hashInviteCode } from "@/lib/invitations/code"
import { createClient } from "@/lib/supabase/server"

const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(8)
    .max(64),
})

const errorMap: Record<
  string,
  string
> = {
  INVALID_INVITATION:
    "That invitation code is invalid.",
  INVITATION_NOT_ACTIVE:
    "That invitation is no longer active.",
  INVITATION_EXPIRED:
    "That invitation has expired.",
  INVITATION_EMAIL_MISMATCH:
    "This invitation was created for a different email address.",
  ACCOUNT_ALREADY_BELONGS_TO_CHURCH:
    "This account already belongs to another church.",
}

export async function joinOrganization(
  formData: FormData
) {
  const parsed = joinSchema.safeParse({
    code: formData.get("code"),
  })

  if (!parsed.success) {
    redirect(
      "/onboarding/join?error=invalid_code"
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

  const { data: existingMembership } =
    await supabase
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

  const { error } =
    await supabase.rpc(
      "accept_organization_invitation",
      {
        p_code_hash:
          hashInviteCode(
            parsed.data.code
          ),
      }
    )

  if (error) {
    const matchingCode =
      Object.keys(errorMap).find(
        (key) =>
          error.message.includes(key)
      )

    redirect(
      `/onboarding/join?error=${
        matchingCode ?? "join_failed"
      }`
    )
  }

  redirect("/")
}