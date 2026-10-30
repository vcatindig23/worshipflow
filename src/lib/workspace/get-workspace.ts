import { cache } from "react"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getProfileAvatarUrlMap } from "@/lib/profile-avatars"
import { getWorkspaceIdentity } from "./get-workspace-identity"

type TeamAssignmentRow = {
  setlist_id: string
  user_id: string
  team_position: string
  confirmation_status: "pending" | "confirmed" | "declined"
}

type SetlistSongRow = {
  setlist_id: string
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
  unreadChatNotificationCount: number
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
    readiness: {
      songCount: number
      confirmedAssignments: number
      pendingAssignments: number
      declinedAssignments: number
      totalAssignments: number
      percentage: number
      status: "ready" | "needs_attention" | "incomplete"
    }
    teamAssignments: {
      userId: string
      displayName: string
      avatarUrl: string | null
      position: string
      confirmationStatus: "pending" | "confirmed" | "declined"
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

export const getWorkspace = cache(async function getWorkspace(): Promise<WorkspaceData> {
  const identity = await getWorkspaceIdentity()
  const {
    supabase,
    userId,
    userName,
    userAvatarUrl,
    userEmail,
    organizationId,
    organizationName,
    organizationDescription,
    organizationEmail,
    organizationPhone,
    organizationAddress,
    organizationWebsite,
    organizationTimezone,
    defaultServiceName,
    defaultServiceDay,
    defaultServiceTime,
    role,
    unreadChatNotificationCount,
  } = identity

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
        .eq("organization_id", organizationId)
        .eq("status", "active"),

      supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", organizationId),

      supabase
        .from("songs")
        .select(
          "id, title, artist, current_key, tempo, updated_at"
        )
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(5),

      supabase
        .from("setlists")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("service_date", getToday(organizationTimezone))
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
        .eq("organization_id", organizationId)
        .in("id", memberSetlistIds)
        .gte("service_date", getToday(organizationTimezone))
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
    "teamAssignments" | "readiness"
  >[]
  const assignmentsBySetlist = new Map<string, TeamAssignmentRow[]>()
  const songCountsBySetlist = new Map<string, number>()

  if (upcomingSetlists.length > 0) {
    const setlistIds = upcomingSetlists.map((setlist) => setlist.id)
    const [assignmentsResult, setlistSongsResult] = await Promise.all([
      supabase
        .from("setlist_team_assignments")
        .select("setlist_id, user_id, team_position, confirmation_status")
        .in("setlist_id", setlistIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("setlist_songs")
        .select("setlist_id")
        .in("setlist_id", setlistIds),
    ])

    if (assignmentsResult.error) {
      throw new Error("Unable to load upcoming service team assignments.")
    }

    if (setlistSongsResult.error) {
      throw new Error("Unable to load upcoming service songs.")
    }

    for (const assignment of (assignmentsResult.data ?? []) as TeamAssignmentRow[]) {
      const setlistAssignments =
        assignmentsBySetlist.get(assignment.setlist_id) ?? []
      setlistAssignments.push(assignment)
      assignmentsBySetlist.set(assignment.setlist_id, setlistAssignments)
    }

    for (const row of (setlistSongsResult.data ?? []) as SetlistSongRow[]) {
      songCountsBySetlist.set(
        row.setlist_id,
        (songCountsBySetlist.get(row.setlist_id) ?? 0) + 1
      )
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
    userName,
    userAvatarUrl,
    userEmail,
    organizationId,
    organizationName,
    organizationDescription,
    organizationEmail,
    organizationPhone,
    organizationAddress,
    organizationWebsite,
    organizationTimezone,
    defaultServiceName,
    defaultServiceDay,
    defaultServiceTime,
    serviceTimeAvailable,
    role,
    songCount: songCountResult.count ?? 0,
    memberCount: memberCountResult.count ?? 0,
    unreadNotificationCount: unreadNotificationsResult.count ?? 0,
    unreadChatNotificationCount,
    recentSongs: recentSongsResult.data ?? [],
    upcomingSetlists: upcomingSetlists.map((setlist) => {
      const assignments = assignmentsBySetlist.get(setlist.id) ?? []
      const songCount = songCountsBySetlist.get(setlist.id) ?? 0
      const confirmedAssignments = assignments.filter(
        (assignment) => assignment.confirmation_status === "confirmed"
      ).length
      const pendingAssignments = assignments.filter(
        (assignment) => assignment.confirmation_status === "pending"
      ).length
      const declinedAssignments = assignments.filter(
        (assignment) => assignment.confirmation_status === "declined"
      ).length
      const totalAssignments = assignments.length
      const checks = [
        Boolean(setlist.service_date && setlist.service_time),
        songCount > 0,
        totalAssignments > 0,
        totalAssignments > 0 && confirmedAssignments === totalAssignments,
      ]
      const percentage = Math.round(
        (checks.filter(Boolean).length / checks.length) * 100
      )
      const readinessStatus =
        percentage === 100
          ? "ready"
          : percentage >= 50
            ? "needs_attention"
            : "incomplete"

      return {
        ...setlist,
        service_time: serviceTimeAvailable ? setlist.service_time : null,
        readiness: {
          songCount,
          confirmedAssignments,
          pendingAssignments,
          declinedAssignments,
          totalAssignments,
          percentage,
          status: readinessStatus as "ready" | "needs_attention" | "incomplete",
        },
        teamAssignments: assignments.map((assignment) => ({
          userId: assignment.user_id,
          displayName: profileNames.get(assignment.user_id) ?? "Name not set",
          avatarUrl:
            assignmentAvatarUrls.get(
              profilesById.get(assignment.user_id)?.avatar_url ?? ""
            ) ?? null,
          position: assignment.team_position,
          confirmationStatus: assignment.confirmation_status,
        })),
      }
    }),
    myUpcomingAssignments,
  }
})
