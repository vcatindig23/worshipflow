import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Join a Church",
  description: "Join your church's existing WorshipFlow workspace with an invitation.",
}

export default function JoinChurchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
