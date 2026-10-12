import Link from "next/link"
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Music2,
  PencilLine,
  ShieldCheck,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import ProfileAvatar from "@/components/profile-avatar"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { getTeamPositionLabel, teamPositionLabels } from "@/lib/team-positions"

type ProfilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProfileRecord = {
  display_name: string | null
  bio: string | null
  location: string | null
  website: string | null
  created_at: string
}

type ActivityRecord = {
  id: string
  action: string
  entity_type: "song" | "service" | "member"
  entity_id: string | null
  entity_name: string
  created_at: string
}

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  worship_leader: "Worship Leader",
  song_editor: "Song Editor",
  team_member: "Team Member",
  viewer: "Viewer",
}

const activityLabels: Record<string, string> = {
  "song.created": "Added a song to the library",
  "song.updated": "Updated a song",
  "song.archived": "Archived a song",
  "song.restored": "Restored a song",
  "song.deleted": "Deleted a song",
  "service.created": "Created a service",
  "service.updated": "Updated a service",
  "service.published": "Published a service",
  "service.archived": "Archived a service",
  "service.restored": "Restored a service",
  "service.deleted": "Deleted a service",
  "service.song_added": "Added a song to a service",
  "service.song_removed": "Removed a song from a service",
  "team.assigned": "Updated a service team assignment",
  "team.unassigned": "Removed a service team assignment",
  "member.joined": "A team member joined",
  "member.role_changed": "Changed a member's workspace role",
  "member.positions_changed": "Updated worship-team positions",
  "member.removed": "Removed a team member",
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isValidWebsite(value: string | null) {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null
  } catch {
    return null
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date)
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function activityHref(item: ActivityRecord) {
  if (!item.entity_id || item.action.endsWith(".deleted")) return null
  if (item.entity_type === "song") return `/songs/${item.entity_id}`
  if (item.entity_type === "service") return `/setlists/${item.entity_id}`
  return "/settings/team"
}

function ActivityList({ items }: { items: ActivityRecord[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
        <Activity className="mx-auto size-6 text-[var(--muted)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">Your activity will appear here</p>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
          Songs you help prepare and services you work on will build your ministry timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {items.map((item) => {
        const href = activityHref(item)
        const Icon = item.entity_type === "song" ? Music2 : item.entity_type === "service" ? CalendarDays : Users
        const content = (
          <div className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5 text-[var(--foreground)]">
                {activityLabels[item.action] ?? "Updated WorshipFlow"}
              </p>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{item.entity_name}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">{formatDateTime(item.created_at)}</p>
            </div>
            {href ? <ArrowUpRight className="mt-1 size-4 shrink-0 text-[var(--muted)]" /> : null}
          </div>
        )

        return href ? (
          <Link
            key={item.id}
            href={href}
            className="block rounded-xl transition hover:bg-[var(--surface)]"
          >
            {content}
          </Link>
        ) : (
          <div key={item.id}>{content}</div>
        )
      })}
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams
  const activeTab = ["overview", "activity", "about"].includes(getParam(params.tab) ?? "")
    ? getParam(params.tab) ?? "overview"
    : "overview"
  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")

  const supabase = await createClient()
  const [profileResult, membershipResult, songsCountResult, servicesCountResult, activityResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, bio, location, website, created_at")
        .eq("id", workspace.userId)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("role, team_positions, created_at")
        .eq("organization_id", workspace.organizationId)
        .eq("user_id", workspace.userId)
        .maybeSingle(),
      supabase
        .from("songs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", workspace.organizationId)
        .eq("created_by", workspace.userId)
        .eq("status", "active"),
      supabase
        .from("setlists")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", workspace.organizationId)
        .eq("created_by", workspace.userId),
      supabase
        .from("organization_activity")
        .select("id, action, entity_type, entity_id, entity_name, created_at")
        .eq("organization_id", workspace.organizationId)
        .eq("actor_id", workspace.userId)
        .order("created_at", { ascending: false })
        .limit(8),
    ])

  if (profileResult.error || !profileResult.data) {
    console.error("Failed to load profile page:", profileResult.error?.message)
    throw new Error("Unable to load your profile. Please refresh and try again.")
  }

  if (membershipResult.error || !membershipResult.data) {
    console.error("Failed to load profile membership:", membershipResult.error?.message)
    throw new Error("Unable to load your church membership.")
  }

  const profile = profileResult.data as ProfileRecord
  const membership = membershipResult.data
  const positions = (membership.team_positions ?? []) as string[]
  const websiteUrl = isValidWebsite(profile.website)
  const displayName = profile.display_name?.trim() || workspace.userName || "Worship Member"
  const activityItems = (activityResult.data ?? []) as ActivityRecord[]
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "activity", label: "Activity" },
    { value: "about", label: "About" },
  ]
  const editLinkClass =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
  const cardClass = "rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6"

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-white shadow-sm">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#101f31] via-[#294d69] to-[#527f9a] sm:h-48">
          <div className="absolute -right-10 -top-24 size-72 rounded-full border border-white/10" />
          <div className="absolute right-16 -top-16 size-60 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 left-[26%] size-64 rounded-full border border-white/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute bottom-5 left-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 sm:left-8">
            <span className="size-1.5 rounded-full bg-white/70" />
            WorshipFlow member profile
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:gap-5">
            <ProfileAvatar
              name={displayName}
              imageUrl={workspace.userAvatarUrl}
              sizeClassName="size-24 sm:size-32"
              className="text-2xl ring-4 ring-white"
            />
            <div className="min-w-0 flex-1 pt-1 sm:pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{displayName}</h1>
                <CheckCircle2 className="size-5 text-[var(--brand)]" aria-label="WorshipFlow member" />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {workspace.organizationName} <span className="px-1.5">·</span> {roleLabels[workspace.role] ?? "Team member"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{profile.location}</span>
                ) : null}
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Member since {formatDate(membership.created_at)}</span>
                {websiteUrl ? (
                  <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline">
                    <ExternalLink className="size-3.5" />Website
                  </a>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-0 sm:pb-1">
              <Link href="/settings/profile" className={editLinkClass}>
                <PencilLine className="size-4" /> Edit profile
              </Link>
              <Link href="/my-schedule" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]">
                <CalendarDays className="size-4" /> My schedule
              </Link>
            </div>
          </div>

          {positions.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {positions.map((position) => (
                <span key={position} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/15 bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
                  {getTeamPositionLabel(position)}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
              Add your worship-team positions—such as drummer, singer, guitarist, or sound engineer—to help your team know how you serve.
              <Link href="/settings/profile" className="ml-1 font-semibold text-[var(--brand)] hover:underline">Add positions</Link>
            </div>
          )}

          <nav aria-label="Profile sections" className="mt-6 flex gap-6 overflow-x-auto border-t border-[var(--border)]">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.value === "overview" ? "/profile" : `/profile?tab=${tab.value}`}
                aria-current={activeTab === tab.value ? "page" : undefined}
                className={`relative -mb-px inline-flex h-12 shrink-0 items-center border-b-2 px-0.5 text-sm font-semibold transition ${
                  activeTab === tab.value
                    ? "border-[var(--brand)] text-[var(--brand)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        {activeTab !== "activity" ? (
          <aside className="space-y-6">
            <section className={cardClass}>
              <SectionHeading
                eyebrow="Introduction"
                title="About me"
                action={<Link href="/settings/profile" className="text-xs font-semibold text-[var(--brand)] hover:underline">Edit</Link>}
              />
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                {profile.bio || "This member hasn't written an introduction yet. Add a short bio about yourself and your heart for worship."}
              </p>
              <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-4 text-[var(--muted)]" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">Workspace access</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{roleLabels[membership.role] ?? "Team member"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 size-4 text-[var(--muted)]" />
                  <div>
                    <p className="text-xs text-[var(--muted)]">Church</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{workspace.organizationName}</p>
                  </div>
                </div>
                {profile.location ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-4 text-[var(--muted)]" />
                    <div>
                      <p className="text-xs text-[var(--muted)]">Location</p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{profile.location}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={cardClass}>
              <SectionHeading
                eyebrow="Ministry"
                title="Worship-team positions"
                description="The areas where you serve your church."
                action={<Link href="/settings/profile" className="text-xs font-semibold text-[var(--brand)] hover:underline">Manage</Link>}
              />
              {positions.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {positions.map((position) => (
                    <span key={position} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]">{teamPositionLabels[position] ?? position}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">No worship positions selected yet.</p>
              )}
            </section>

            <section className={cardClass}>
              <SectionHeading eyebrow="Your contribution" title="WorshipFlow activity" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-[var(--brand)]"><Music2 className="size-4" /><span className="text-xs font-medium text-[var(--muted)]">Songs added</span></div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{songsCountResult.count ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-2 text-[var(--brand)]"><CalendarDays className="size-4" /><span className="text-xs font-medium text-[var(--muted)]">Services planned</span></div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{servicesCountResult.count ?? 0}</p>
                </div>
              </div>
            </section>
          </aside>
        ) : null}

        <div className="min-w-0 space-y-6">
          {activeTab === "about" ? (
            <section className={cardClass}>
              <SectionHeading eyebrow="Profile details" title="About" description="The information you share with members of your church workspace." />
              <dl className="mt-5 divide-y divide-[var(--border)]">
                <div className="py-4 first:pt-0">
                  <dt className="text-xs font-medium text-[var(--muted)]">Name</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{displayName}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-[var(--muted)]">Church</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{workspace.organizationName}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-[var(--muted)]">Workspace role</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{roleLabels[membership.role] ?? "Team member"}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-[var(--muted)]">Location</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{profile.location || "Not added"}</dd>
                </div>
                <div className="py-4">
                  <dt className="text-xs font-medium text-[var(--muted)]">Website or social link</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline">{profile.website}<ExternalLink className="size-3.5" /></a> : "Not added"}
                  </dd>
                </div>
                <div className="py-4 last:pb-0">
                  <dt className="text-xs font-medium text-[var(--muted)]">Member since</dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{formatDate(membership.created_at)}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <Link href="/settings/profile" className={editLinkClass}><PencilLine className="size-4" /> Edit details</Link>
              </div>
            </section>
          ) : null}

          {activeTab === "overview" || activeTab === "activity" ? (
            <section className={cardClass}>
              <SectionHeading
                eyebrow={activeTab === "activity" ? "Ministry timeline" : "Recent activity"}
                title={activeTab === "activity" ? "Your activity" : "What you've been working on"}
                description="A timeline of the songs, services, and team updates you have contributed to."
                action={activeTab === "overview" ? <Link href="/profile?tab=activity" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">See all <ArrowUpRight className="size-3.5" /></Link> : undefined}
              />
              <div className="mt-5">
                <ActivityList items={activityItems} />
              </div>
            </section>
          ) : null}

          {activeTab === "overview" ? (
            <section className={cardClass}>
              <SectionHeading
                eyebrow="Coming up"
                title="My assigned services"
                description="Upcoming services where your team has assigned you a worship position."
                action={<Link href="/my-schedule" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">Full schedule <ArrowUpRight className="size-3.5" /></Link>}
              />
              <div className="mt-4 space-y-3">
                {workspace.myUpcomingAssignments.length ? workspace.myUpcomingAssignments.map((service) => (
                  <Link key={service.id} href={`/setlists/${service.id}`} className="block rounded-2xl border border-[var(--border)] p-4 transition hover:border-[var(--brand)] hover:bg-[var(--surface)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)]">{service.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <CalendarDays className="size-3.5" />{formatDate(service.service_date)}
                          {service.service_time ? <><span>·</span><Clock3 className="size-3.5" />{service.service_time.slice(0, 5)}</> : null}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)]">
                        {service.positions.map((position) => teamPositionLabels[position] ?? position).join(", ")}
                      </span>
                    </div>
                  </Link>
                )) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-6 text-center">
                    <CalendarDays className="mx-auto size-5 text-[var(--muted)]" />
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">No upcoming assigned services</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">When a worship leader assigns you to a service, it will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeTab === "about" ? (
            <section className={cardClass}>
              <SectionHeading eyebrow="How you serve" title="Worship roles" />
              <div className="mt-4 flex flex-wrap gap-2">
                {positions.length ? positions.map((position) => (
                  <span key={position} className="rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">{getTeamPositionLabel(position)}</span>
                )) : <p className="text-sm text-[var(--muted)]">Add your ministry positions from profile settings.</p>}
              </div>
            </section>
          ) : null}

          <p className="px-1 text-xs leading-5 text-[var(--muted)]">
            Your profile and ministry details are visible to members of {workspace.organizationName}. Your sign-in email and account security details are kept in Settings.
          </p>
        </div>
      </div>
    </main>
  )
}
