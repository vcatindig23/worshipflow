import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile Settings",
  description: "Update your WorshipFlow account and personal preferences.",
}

export default function ProfileSettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
