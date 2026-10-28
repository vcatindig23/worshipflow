import type { Metadata } from "next"
import { PageContainer } from "@/components/ui/page"
import ChordChartExplorer from "@/components/chord-chart/chord-chart-explorer"
import { getWorkspace } from "@/lib/workspace/get-workspace"

export const metadata: Metadata = {
  title: "Guitar & Piano Chord Chart",
  description: "Explore guitar and piano chord notes, extended chord types, fretboard positions, and sound samples.",
}

export default async function ChordChartPage() {
  await getWorkspace()

  return (
    <PageContainer className="space-y-6">
      <ChordChartExplorer />
    </PageContainer>
  )
}
