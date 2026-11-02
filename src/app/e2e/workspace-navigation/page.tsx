import { notFound } from "next/navigation"
import DashboardDesktopNavigation from "@/components/dashboard-desktop-navigation"
import DashboardMobileNavigation from "@/components/dashboard-mobile-navigation"

export const dynamic = "force-dynamic"

export default function WorkspaceNavigationPreviewPage() {
  if (process.env.WORSHIPFLOW_E2E !== "true") {
    notFound()
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <aside className="hidden min-h-dvh w-[264px] flex-col bg-[var(--sidebar)] text-white lg:flex">
        <div className="border-b border-white/10 px-5 py-6 text-sm font-semibold">
          Workspace navigation fixture
        </div>
        <DashboardDesktopNavigation />
      </aside>
      <header className="flex items-center gap-3 border-b border-[var(--border)] p-4 lg:hidden">
        <DashboardMobileNavigation
          userName="Worship Leader"
          role="worship_leader"
          userAvatarUrl={null}
        />
        <span className="text-sm font-semibold">Workspace navigation fixture</span>
      </header>
    </main>
  )
}
