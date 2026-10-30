import { cache } from "react"
import { redirect } from "next/navigation"
import { isRole } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"

export const getWorkspaceIdentity = cache(async function getWorkspaceIdentity() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    redirect("/login")
  }

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("organization_members")
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          description,
          contact_email,
          contact_phone,
          address,
          website,
          timezone,
          default_service_name,
          default_service_day,
          default_service_time,
          onboarding_completed_at
        )
      `)
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle(),
  ])

  if (profileResult.error) {
    throw new Error("Unable to load your profile.")
  }

  if (membershipResult.error) {
    throw new Error("Unable to load your church membership.")
  }

  const membership = membershipResult.data

  if (!membership) {
    redirect("/onboarding")
  }

  if (!isRole(membership.role)) {
    redirect("/error?code=permission_denied")
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  if (!organization) {
    throw new Error("Unable to load your church workspace.")
  }

  const [avatarUrls, unreadChatNotifications] = await Promise.all([
    getProfileAvatarUrlMap(supabase, [profileResult.data?.avatar_url ?? null]),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("organization_id", membership.organization_id)
      .in("type", ["team_chat_message", "team_chat_mention"])
      .is("read_at", null),
  ])

  if (unreadChatNotifications.error) {
    throw new Error("Unable to count unread team chat notifications.")
  }

  const avatarPath = profileResult.data?.avatar_url ?? ""

  return {
    supabase,
    userId,
    userName: profileResult.data?.display_name?.trim() || "Worship Member",
    userAvatarUrl: avatarUrls.get(avatarPath) ?? null,
    userEmail: claimsData.claims.email ?? "",
    organizationId: membership.organization_id,
    organizationName: organization.name,
    organizationDescription: organization.description,
    organizationEmail: organization.contact_email,
    organizationPhone: organization.contact_phone,
    organizationAddress: organization.address,
    organizationWebsite: organization.website,
    organizationTimezone: organization.timezone,
    defaultServiceName: organization.default_service_name,
    defaultServiceDay: organization.default_service_day,
    defaultServiceTime: organization.default_service_time,
    role: membership.role,
    unreadChatNotificationCount: unreadChatNotifications.count ?? 0,
  }
})
