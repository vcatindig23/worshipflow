import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Service History",
  description: "Review completed worship services, attendance, notes, and service outcomes.",
}

export default function ServiceHistoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
