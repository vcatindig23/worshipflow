import { PageContainer, PageHeader } from "@/components/ui/page"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Church,
  Palette,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import ThemeToggleButton from "@/components/theme-toggle-button"
import PwaInstallCard from "@/components/pwa-install-card"

export default async function SettingsPage() {
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, description")
    .eq(
      "id",
      workspace.organizationId
    )
    .maybeSingle()

  if (!organization) {
    redirect("/onboarding")
  }

  const isAdmin =
    workspace.role === "admin"

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={<>Settings</>}
        eyebrow={<><ShieldCheck className="size-3.5" />
          Workspace Settings</>}
        description={<>Manage your church workspace, team members, roles, and
          organization information.</>}
      />

      <section className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Palette aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--foreground)]">Appearance</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Choose light or dark mode. Your preference is saved on this device and applies across WorshipFlow.
            </p>
          </div>
        </div>
        <ThemeToggleButton variant="card" className="w-full sm:w-auto" />
      </section>

      <PwaInstallCard />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/settings/profile"
          className="group wf-card p-5 sm:p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <UserRound className="size-6" />
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Your Profile
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Update your name and photo, and review your sign-in email and church role.
              </p>
            </div>

            <ArrowRight className="mt-1 size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
          </div>
        </Link>

        <Link
          href="/settings/church"
          className="group wf-card p-5 sm:p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Church className="size-6" />
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Church Settings
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Update your church name, contact information,
                address, website, and default service details.
              </p>
            </div>

            <ArrowRight className="mt-1 size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Current workspace
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-[var(--foreground)]">
              {organization.name}
            </p>
          </div>
        </Link>

        <Link
          href="/settings/team"
          className="group wf-card p-5 sm:p-6 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--brand)]">
            <Users className="size-6" />
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Team & Roles
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Manage church members, send invitations, and assign
                WorshipFlow roles.
              </p>
            </div>

            <ArrowRight className="mt-1 size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" />
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--surface)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Your role
            </p>

            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {workspace.role === "admin"
                ? "Administrator"
                : workspace.role === "worship_leader"
                  ? "Worship Leader"
                  : workspace.role === "song_editor"
                    ? "Song Editor"
                    : workspace.role === "team_member"
                      ? "Team Member"
                      : "Viewer"}
            </p>
          </div>
        </Link>
      </section>

      <section className="wf-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Building2 className="size-5" />
          </div>

          <div>
            <h2 className="font-semibold text-[var(--foreground)]">
              Organization Access
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Songs, setlists, and future WorshipFlow features are
              shared only with members of this church workspace.
            </p>

            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Current organization ID:{" "}
              <span className="font-mono">
                {workspace.organizationId}
              </span>
            </p>
          </div>
        </div>
      </section>

      {!isAdmin ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700" />

            <div>
              <p className="font-semibold text-amber-950">
                Administrator access required for team management
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                You can view your role here, but only an administrator
                can invite members or change their roles.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </PageContainer>
  )
}