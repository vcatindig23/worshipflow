import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Your profile",
  description: "Manage your WorshipFlow profile and worship team details.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
