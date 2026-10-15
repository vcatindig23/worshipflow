import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Service Insights",
  description: "Explore worship service completion, attendance, timing, and song-use trends.",
}

export default function ServiceInsightsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
