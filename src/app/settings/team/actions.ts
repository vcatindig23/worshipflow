"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  generateInviteCode,
  hashInviteCode,
} from "@/lib/invitations/code"
import { createClient } from "@/lib/supabase/server"

const invitationSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320),
  role: z.enum([
    "worship_leader",
    "song_editor",
    "team_member",
    "viewer",
  ]),
})

const memberRoleSchema = z.enum([
  "admin",
  "worship_leader",
  "song_editor",
  "team_member",
  "viewer",
])

const uuidSchema = z.string().uuid()

export type InvitationState = {
  success: boolean
  code: string
  error: string
}

async function getCurrentMembership() {
  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId =
    claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const {
    data: membership,
    error,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (error || !membership) {
    redirect("/onboarding")
  }

  return {
    supabase,
    userId,
    organizationId:
      membership.organization_id,
    role: membership.role,
  }
}

export async function createInvitation(
  _previousState: InvitationState,
  formData: FormData
): Promise<InvitationState> {
  const parsed =
    invitationSchema.safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
    })

  if (!parsed.success) {
    return {
      success: false,
      code: "",
      error:
        "Enter a valid email address and invitation role.",
    }
  }

  const {
    supabase,
    organizationId,
    role,
  } = await getCurrentMembership()

  if (role !== "admin") {
    return {
      success: false,
      code: "",
      error:
        "Only administrators can invite team members.",
    }
  }

  const code =
    generateInviteCode()

  const codeHash =
    hashInviteCode(code)

  const { error } =
    await supabase.rpc(
      "create_organization_invitation",
      {
        p_organization_id:
          organizationId,
        p_email:
          parsed.data.email.toLowerCase(),
        p_role:
          parsed.data.role,
        p_code_hash:
          codeHash,
      }
    )

  if (error) {
    if (
      error.message.includes(
        "USER_ALREADY_MEMBER"
      )
    ) {
      return {
        success: false,
        code: "",
        error:
          "That email is already a member of this church.",
      }
    }

    if (
      error.message.includes(
        "ADMINISTRATOR_REQUIRED"
      )
    ) {
      return {
        success: false,
        code: "",
        error:
          "Only administrators can create invitations.",
      }
    }

    if (
      error.message.includes(
        "organization_invitations_pending_email_idx"
      ) ||
      error.message.includes("duplicate")
    ) {
      return {
        success: false,
        code: "",
        error:
          "There is already a pending invitation for that email.",
      }
    }

    return {
      success: false,
      code: "",
      error:
        "The invitation could not be created.",
    }
  }

  revalidatePath(
    "/settings/team"
  )

  return {
    success: true,
    code,
    error: "",
  }
}

export async function revokeInvitation(
  formData: FormData
) {
  const invitationId =
    String(
      formData.get(
        "invitationId"
      ) ?? ""
    ).trim()

  if (
    !uuidSchema.safeParse(
      invitationId
    ).success
  ) {
    redirect(
      "/settings/team?error=invalid_invitation"
    )
  }

  const { supabase } =
    await getCurrentMembership()

  const { error } =
    await supabase.rpc(
      "revoke_organization_invitation",
      {
        p_invitation_id:
          invitationId,
      }
    )

  if (error) {
    redirect(
      "/settings/team?error=invite_revoke_failed"
    )
  }

  revalidatePath(
    "/settings/team"
  )

  redirect("/settings/team")
}

export async function updateMemberRole(
  formData: FormData
) {
  const userId =
    String(
      formData.get("userId") ?? ""
    ).trim()

  const role =
    String(
      formData.get("role") ?? ""
    ).trim()

  const parsedUserId =
    uuidSchema.safeParse(userId)

  const parsedRole =
    memberRoleSchema.safeParse(role)

  if (
    !parsedUserId.success ||
    !parsedRole.success
  ) {
    redirect(
      "/settings/team?error=invalid_member_update"
    )
  }

  const {
    supabase,
    organizationId,
    role: currentRole,
  } = await getCurrentMembership()

  if (currentRole !== "admin") {
    redirect(
      "/settings/team?error=administrator_required"
    )
  }

  const { error } =
    await supabase.rpc(
      "update_organization_member_role",
      {
        p_organization_id:
          organizationId,
        p_user_id:
          parsedUserId.data,
        p_role:
          parsedRole.data,
      }
    )

  if (error) {
    redirect(
      "/settings/team?error=member_role_failed"
    )
  }

  revalidatePath(
    "/settings/team"
  )
  revalidatePath("/")
  revalidatePath("/songs")
  revalidatePath("/setlists")

  redirect("/settings/team")
}

export async function removeMember(
  formData: FormData
) {
  const userId =
    String(
      formData.get("userId") ?? ""
    ).trim()

  if (
    !uuidSchema.safeParse(
      userId
    ).success
  ) {
    redirect(
      "/settings/team?error=invalid_member"
    )
  }

  const {
    supabase,
    organizationId,
    role,
    userId: currentUserId,
  } = await getCurrentMembership()

  if (role !== "admin") {
    redirect(
      "/settings/team?error=administrator_required"
    )
  }

  if (userId === currentUserId) {
    redirect(
      "/settings/team?error=cannot_remove_self"
    )
  }

  const { error } =
    await supabase.rpc(
      "remove_organization_member",
      {
        p_organization_id:
          organizationId,
        p_user_id:
          userId,
      }
    )

  if (error) {
    redirect(
      "/settings/team?error=member_remove_failed"
    )
  }

  revalidatePath(
    "/settings/team"
  )
  revalidatePath("/")
  revalidatePath("/songs")
  revalidatePath("/setlists")

  redirect("/settings/team")
}