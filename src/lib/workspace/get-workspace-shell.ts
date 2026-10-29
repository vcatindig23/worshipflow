import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
import { isRole, type Role } from "@/lib/permissions"

export type WorkspaceShellData = {
  userName: string
  userAvatarUrl: string | null
  role: Role
  organizationName: string
  unreadChatNotificationCount: number
}

export const getWorkspaceShellData = cache(
  async function getWorkspaceShellData(): Promise<WorkspaceShellData> {
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
        .select("organization_id, role, organizations ( id, name )")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(),
    ])

    if (profileResult.error) {
      throw new Error("Unable to load your profile for workspace navigation.")
    }

    if (membershipResult.error) {
      throw new Error("Unable to load your workspace membership for navigation.")
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
      throw new Error("Unable to load your church workspace for navigation.")
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
      userName: profileResult.data?.display_name?.trim() || "Worship Member",
      userAvatarUrl: avatarUrls.get(avatarPath) ?? null,
      role: membership.role,
      organizationName: organization.name,
      unreadChatNotificationCount: unreadChatNotifications.count ?? 0,
    }
  }
)
