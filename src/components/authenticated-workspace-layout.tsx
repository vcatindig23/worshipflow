import type { ReactNode } from "react"
import WorshipFlowShell from "@/components/worshipflow-shell"
import { getWorkspaceShellData } from "@/lib/workspace/get-workspace-shell"

export default async function AuthenticatedWorkspaceLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const workspace = await getWorkspaceShellData()

  return (
    <WorshipFlowShell workspace={workspace}>
      {children}
    </WorshipFlowShell>
  )
}
