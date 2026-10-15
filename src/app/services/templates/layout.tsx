import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Service Templates",
  description: "Save and reuse worship service plans, song arrangements, notes, and timelines.",
}

export default function ServiceTemplatesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
