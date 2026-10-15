import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team Management",
  description: "Manage worship team members, invitations, and workspace roles.",
}

export default function TeamSettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
