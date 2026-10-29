import AuthenticatedWorkspaceLayout from "@/components/authenticated-workspace-layout"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Workspace search",
  description:
    "Search songs, setlists, services, and other items in your WorshipFlow workspace.",
}

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedWorkspaceLayout>{children}</AuthenticatedWorkspaceLayout>
}
