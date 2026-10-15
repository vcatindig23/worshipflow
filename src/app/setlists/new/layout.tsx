import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create a Setlist",
  description: "Create a worship service setlist and organize songs, service details, and team preparation.",
}

export default function NewSetlistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
