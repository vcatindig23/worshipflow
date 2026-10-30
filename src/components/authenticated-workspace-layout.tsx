import type { ReactNode } from "react"
import WorshipFlowShell from "@/components/worshipflow-shell"
import { getWorkspaceIdentity } from "@/lib/workspace/get-workspace-identity"

export default async function AuthenticatedWorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const identity = await getWorkspaceIdentity()

  return (
    <WorshipFlowShell
      workspace={{
        userName: identity.userName,
        userAvatarUrl: identity.userAvatarUrl,
        role: identity.role,
        organizationName: identity.organizationName,
        unreadChatNotificationCount: identity.unreadChatNotificationCount,
      }}
    >
      {children}
    </WorshipFlowShell>
  )
}
