import AuthenticatedWorkspaceLayout from "@/components/authenticated-workspace-layout"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Setlists",
  description: "Prepare worship setlists, song order, chord charts, and live stage plans.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedWorkspaceLayout>{children}</AuthenticatedWorkspaceLayout>
}
