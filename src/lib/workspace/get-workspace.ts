import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type TeamAssignmentRow = {
  setlist_id: string
  user_id: string
  team_position: string
}

type MemberProfile = {
  id: string
  display_name: string | null
}

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
  upcomingSetlists: {
    id: string
    name: string
    service_date: string
    status: "draft" | "published" | "archived"
    teamAssignments: {
      userId: string
      displayName: string
      position: string
    }[]
  }[]
}

function getToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ""

  return `${part("year")}-${part("month")}-${part("day")}`
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

  const [songCountResult, memberCountResult, recentSongsResult, upcomingSetlistsResult] =
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

      supabase
        .from("setlists")
        .select("id, name, service_date, status")
        .eq("organization_id", membership.organization_id)
        .gte("service_date", getToday(organization.timezone))
        .neq("status", "archived")
        .order("service_date", { ascending: true })
        .limit(3),
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

  if (upcomingSetlistsResult.error) {
    throw new Error("Unable to load upcoming services.")
  }

  const upcomingSetlists = (upcomingSetlistsResult.data ??
    []) as Omit<
    WorkspaceData["upcomingSetlists"][number],
    "teamAssignments"
  >[]
  const assignmentsBySetlist = new Map<string, TeamAssignmentRow[]>()

  if (upcomingSetlists.length > 0) {
    const { data: assignmentRows, error: assignmentsError } = await supabase
      .from("setlist_team_assignments")
      .select("setlist_id, user_id, team_position")
      .in(
        "setlist_id",
        upcomingSetlists.map((setlist) => setlist.id)
      )
      .order("created_at", { ascending: true })

    if (assignmentsError) {
      throw new Error("Unable to load upcoming service team assignments.")
    }

    for (const assignment of (assignmentRows ?? []) as TeamAssignmentRow[]) {
      const setlistAssignments =
        assignmentsBySetlist.get(assignment.setlist_id) ?? []
      setlistAssignments.push(assignment)
      assignmentsBySetlist.set(assignment.setlist_id, setlistAssignments)
    }
  }

  const assignedUserIds = Array.from(
    new Set(
      Array.from(assignmentsBySetlist.values()).flatMap((assignments) =>
        assignments.map((assignment) => assignment.user_id)
      )
    )
  )
  const profileNames = new Map<string, string>()

  if (assignedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", assignedUserIds)

    if (profilesError) {
      throw new Error("Unable to load names for upcoming service teams.")
    }

    for (const profile of (profiles ?? []) as MemberProfile[]) {
      profileNames.set(
        profile.id,
        profile.display_name?.trim() || "Name not set"
      )
    }
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
    upcomingSetlists: upcomingSetlists.map((setlist) => ({
      ...setlist,
      teamAssignments: (assignmentsBySetlist.get(setlist.id) ?? []).map(
        (assignment) => ({
          userId: assignment.user_id,
          displayName: profileNames.get(assignment.user_id) ?? "Name not set",
          position: assignment.team_position,
        })
      ),
    })),
  }
}