import { notFound } from "next/navigation"
import WorshipFlowShell from "@/components/worshipflow-shell"

export const dynamic = "force-dynamic"

export default function WorkspaceNavigationPreviewPage() {
  if (process.env.WORSHIPFLOW_E2E !== "true") {
    notFound()
  }

  return (
    <WorshipFlowShell
      workspace={{
        userName: "Worship Leader",
        userAvatarUrl: null,
        role: "worship_leader",
        organizationName: "WorshipFlow E2E",
        unreadChatNotificationCount: 0,
      }}
    >
      <main className="min-h-[calc(100vh-78px)] bg-[var(--background)] px-5 py-8 text-[var(--foreground)] sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-medium text-[var(--muted)]">
            Navigation preview
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Workspace navigation fixture
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            This route renders the authenticated workspace shell with preview
            account data so desktop and mobile navigation can be tested without
            a live account.
          </p>
        </div>
      </main>
    </WorshipFlowShell>
  )
}
