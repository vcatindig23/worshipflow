import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team chat",
  description: "Coordinate with your worship team in WorshipFlow team chat.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
