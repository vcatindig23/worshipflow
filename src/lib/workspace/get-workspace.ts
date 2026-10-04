import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type WorkspaceData = {
  userId: string
  userName: string
  userEmail: string
  organizationId: string
  organizationName: string
  organizationDescription: string | null
  organizationEmail: string | null
  organizationPhone: string | null
  organizationAddress: string | null
  organizationWebsite: string | null
  organizationTimezone: string
  defaultServiceName: string
  defaultServiceDay: number
  defaultServiceTime: string
  role: string
  songCount: number
  memberCount: number
  recentSongs: {
    id: string
    title: string
    artist: string | null
    current_key: string | null
    tempo: number | null
    updated_at: string
  }[]
}

export async function getWorkspace(): Promise<WorkspaceData> {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const [profileResult, membershipResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
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

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations

  if (!organization) {
    throw new Error("Unable to load your church workspace.")
  }

  const [songCountResult, memberCountResult, recentSongsResult] =
    await Promise.all([
      supabase
        .from("songs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("status", "active"),

      supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id),

      supabase
        .from("songs")
        .select(
          "id, title, artist, current_key, tempo, updated_at"
        )
        .eq("organization_id", membership.organization_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(5),
    ])

  if (songCountResult.error) {
    throw new Error("Unable to count songs.")
  }

  if (memberCountResult.error) {
    throw new Error("Unable to count church members.")
  }

  if (recentSongsResult.error) {
    throw new Error("Unable to load recent songs.")
  }

  return {
    userId,
    userName: profileResult.data?.display_name ?? "Worship Member",
    userEmail:
      claimsData.claims.email ??
      "",
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
    songCount: songCountResult.count ?? 0,
    memberCount: memberCountResult.count ?? 0,
    recentSongs: recentSongsResult.data ?? [],
  }
}