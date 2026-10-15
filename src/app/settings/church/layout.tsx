import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Church Profile",
  description: "Manage your church workspace name, details, and organizational preferences.",
}

export default function ChurchSettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
