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
        userName: "Navigation test member",
        userAvatarUrl: null,
        role: "admin",
        organizationName: "WorshipFlow Test Workspace",
        unreadChatNotificationCount: 0,
      }}
    >
      <main id="main-content" className="wf-page">
        <h1 className="wf-page-title">Navigation test workspace</h1>
        <p className="wf-page-description">
          This page exists only to verify shared workspace navigation in the browser.
        </p>
      </main>
    </WorshipFlowShell>
  )
}
