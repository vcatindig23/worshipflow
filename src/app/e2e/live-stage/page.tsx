import { notFound } from "next/navigation"
import LiveStageView from "@/components/setlists/live-stage-view"
import type { LiveStageSong } from "@/lib/live-stage"

export const dynamic = "force-dynamic"

const songs: LiveStageSong[] = [
  {
    id: "stage-layout-song",
    title: "Grace in Every Season",
    artist: "WorshipFlow layout fixture",
    source: `{title: Grace in Every Season}
{key: C}
{start_of_intro}
[C] [G] [Am] [F] [C/E] [Dm7] [G]
{end_of_intro}
{start_of_verse_1}
[C]Amazing grace, how sweet the sound that saved a soul just like me; I once was lost, but now I am found, was blind, but now I see. [G]You lead me through every valley with a love that never lets me go.
{end_of_verse_1}
[F]You are faithful.`,
    section: "Worship",
    key: "G",
    capo: 0,
    tempo: 72,
    notes: null,
    position: 0,
  },
  {
    id: "stage-layout-missing-chart",
    title: "Song without a chart",
    artist: null,
    source: "",
    section: "Response",
    key: "D",
    capo: null,
    tempo: null,
    notes: null,
    position: 1,
  },
]

export default function LiveStageLayoutPreviewPage() {
  if (process.env.WORSHIPFLOW_E2E !== "true") {
    notFound()
  }

  return (
    <LiveStageView
      setlistId="e2e-stage-layout"
      setlistName="Stage layout rehearsal"
      canManageCompletion={false}
      isServiceCompleted={false}
      userId="00000000-0000-4000-8000-000000000001"
      songs={songs}
      serviceDate="2026-10-31"
      serviceTime="09:00"
      status="published"
      description={null}
      serviceNotes={null}
      announcements={null}
      timeline={[]}
      team={[]}
      resources={[]}
    />
  )
}
