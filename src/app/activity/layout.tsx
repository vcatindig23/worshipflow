import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Activity",
  description: "Review recent worship team updates, service changes, and workspace activity.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
