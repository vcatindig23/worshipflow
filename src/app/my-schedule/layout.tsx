import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My schedule",
  description: "View your worship assignments, upcoming services, and availability.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
