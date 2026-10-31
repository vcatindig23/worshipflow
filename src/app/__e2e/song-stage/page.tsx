import { notFound } from "next/navigation"
import SongViewer from "@/components/songs/song-viewer"

export const dynamic = "force-dynamic"

const source = `{title: Grace in Every Season}
{key: C}
{start_of_intro}
[C] [G] [Am] [F] [C/E] [Dm7] [G]
{end_of_intro}
{start_of_verse_1}
[C]Amazing grace, how sweet the sound that saved a soul just like me; I once was lost, but now I am found, was blind, but now I see. [G]You lead me through every valley with a love that never lets me go.
{end_of_verse_1}
[F]You are faithful.`

export default function SongStageLayoutPreviewPage() {
  if (process.env.WORSHIPFLOW_E2E !== "true") {
    notFound()
  }

  return (
    <main className="min-h-dvh">
      <SongViewer source={source} title="Grace in Every Season" />
    </main>
  )
}
