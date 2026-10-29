import type { Metadata } from "next"
import AuthenticatedWorkspaceLayout from "@/components/authenticated-workspace-layout"

export const metadata: Metadata = {
  title: "Guitar & Piano Chord Chart",
  description:
    "Explore guitar and piano chord notes, extended chord types, fretboard positions, and sound samples.",
}

export default function ChordChartLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AuthenticatedWorkspaceLayout>{children}</AuthenticatedWorkspaceLayout>
}
