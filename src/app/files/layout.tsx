import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Team files",
  description: "Browse and organize files shared with your church worship team.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
