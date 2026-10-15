import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Songs",
  description: "Organize worship songs, chord charts, lyrics, keys, and arrangements.",
}

export default function RouteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
