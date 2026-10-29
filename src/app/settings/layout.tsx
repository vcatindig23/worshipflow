import AuthenticatedWorkspaceLayout from "@/components/authenticated-workspace-layout"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Workspace settings",
  description: "Manage your WorshipFlow workspace, church details, and team preferences.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedWorkspaceLayout>{children}</AuthenticatedWorkspaceLayout>
}
