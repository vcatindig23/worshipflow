import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notifications",
  description: "Review updates and notifications from your WorshipFlow team.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
