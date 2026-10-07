import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"

type TeamAssignmentRow = {
  setlist_id: string
  user_id: string
  team_position: string
}

type MemberProfile = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type MemberAssignmentRow = {
  setlist_id: string
  team_position: string
}

export type WorkspaceData = {
  userId: string
  userName: string
  userAvatarUrl: string | null
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
  serviceTimeAvailable: boolean
  role: string
  songCount: number
  memberCount: number
  unreadNotificationCount: number
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
    service_time: string | null
    status: "draft" | "published" | "archived"
    teamAssignments: {
      userId: string
      displayName: string
      avatarUrl: string | null
      position: string
    }[]
  }[]
  myUpcomingAssignments: {
    id: string
    name: string
    service_date: string
    service_time: string | null
    positions: string[]
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

  const userAvatarUrls = await getProfileAvatarUrlMap(supabase, [
    profileResult.data?.avatar_url ?? null,
  ])

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

  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const [
    songCountResult,
    memberCountResult,
    recentSongsResult,
    upcomingSetlistsResult,
    memberAssignmentsResult,
    unreadNotificationsResult,
  ] =
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
        .select("*")
        .eq("organization_id", membership.organization_id)
        .gte("service_date", getToday(organization.timezone))
        .neq("status", "archived")
        .order("service_date", { ascending: true })
        .limit(3),

      supabase
        .from("setlist_team_assignments")
        .select("setlist_id, team_position")
        .eq("user_id", userId),

      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null),
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

  if (memberAssignmentsResult.error) {
    throw new Error("Unable to load your service assignments.")
  }

  if (unreadNotificationsResult.error) {
    throw new Error("Unable to count your unread notifications.")
  }

  const memberAssignments = (memberAssignmentsResult.data ??
    []) as MemberAssignmentRow[]
  const memberSetlistIds = Array.from(
    new Set(memberAssignments.map((assignment) => assignment.setlist_id))
  )
  let myUpcomingAssignments: WorkspaceData["myUpcomingAssignments"] = []

  if (memberSetlistIds.length > 0) {
    const { data: assignedSetlists, error: assignedSetlistsError } =
      await supabase
        .from("setlists")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .in("id", memberSetlistIds)
        .gte("service_date", getToday(organization.timezone))
        .neq("status", "archived")
        .order("service_date", { ascending: true })
        .limit(3)

    if (assignedSetlistsError) {
      throw new Error("Unable to load your upcoming assigned services.")
    }

    const positionsBySetlist = new Map<string, string[]>()
    for (const assignment of memberAssignments) {
      const positions = positionsBySetlist.get(assignment.setlist_id) ?? []
      positions.push(assignment.team_position)
      positionsBySetlist.set(assignment.setlist_id, positions)
    }

    myUpcomingAssignments = (assignedSetlists ?? []).map((setlist) => ({
      ...setlist,
      service_time: serviceTimeAvailable
        ? setlist.service_time
        : null,
      positions: positionsBySetlist.get(setlist.id) ?? [],
    }))
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
  const profilesById = new Map<string, MemberProfile>()
  const profileNames = new Map<string, string>()
  let assignmentAvatarUrls = new Map<string, string>()

  if (assignedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", assignedUserIds)

    if (profilesError) {
      throw new Error("Unable to load names for upcoming service teams.")
    }

    const memberProfiles = (profiles ?? []) as MemberProfile[]
    for (const profile of memberProfiles) {
      profilesById.set(profile.id, profile)
      profileNames.set(
        profile.id,
        profile.display_name?.trim() || "Name not set"
      )
    }

    assignmentAvatarUrls = await getProfileAvatarUrlMap(
      supabase,
      memberProfiles.map((profile) => profile.avatar_url)
    )
  }

  return {
    userId,
    userName: profileResult.data?.display_name ?? "Worship Member",
    userAvatarUrl:
      userAvatarUrls.get(profileResult.data?.avatar_url ?? "") ?? null,
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
    serviceTimeAvailable,
    role: membership.role,
    songCount: songCountResult.count ?? 0,
    memberCount: memberCountResult.count ?? 0,
    unreadNotificationCount: unreadNotificationsResult.count ?? 0,
    recentSongs: recentSongsResult.data ?? [],
    upcomingSetlists: upcomingSetlists.map((setlist) => ({
      ...setlist,
      service_time: serviceTimeAvailable
        ? setlist.service_time
        : null,
      teamAssignments: (assignmentsBySetlist.get(setlist.id) ?? []).map(
        (assignment) => ({
          userId: assignment.user_id,
          displayName: profileNames.get(assignment.user_id) ?? "Name not set",
          avatarUrl:
            assignmentAvatarUrls.get(
              profilesById.get(assignment.user_id)?.avatar_url ?? ""
            ) ?? null,
          position: assignment.team_position,
        })
      ),
    })),
    myUpcomingAssignments,
  }
}