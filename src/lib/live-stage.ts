export type StageSongSummary = {
  id: string
  title: string
  artist: string | null
}

export type LiveStageSong = StageSongSummary & {
  source: string
  section: string
  key: string | null
  capo: number | null
  tempo: number | null
  notes: string | null
  position: number
}

export type OrderedStageSong = {
  song_id: string
  position: number
  section: string
  key_override: string | null
  capo_override: number | null
  tempo_override: number | null
  notes: string | null
}

export type StageSongChart = {
  id: string
  title: string
  artist: string | null
  current_key: string | null
  tempo: number | null
  capo: number | null
  chordpro_source: string
}

export function buildLiveStageSongs(
  orderedSongs: OrderedStageSong[],
  charts: StageSongChart[]
): LiveStageSong[] {
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]))

  return orderedSongs.map((item) => {
    const chart = chartsById.get(item.song_id)

    return {
      id: item.song_id,
      title: chart?.title ?? "Song unavailable",
      artist: chart?.artist ?? null,
      source: chart?.chordpro_source ?? "",
      section: item.section,
      key: item.key_override ?? chart?.current_key ?? null,
      capo: item.capo_override ?? chart?.capo ?? null,
      tempo: item.tempo_override ?? chart?.tempo ?? null,
      notes: item.notes,
      position: item.position,
    }
  })
}

export function getBoundedStageIndex(
  currentIndex: number,
  offset: number,
  songCount: number
) {
  if (songCount <= 0) {
    return null
  }

  return Math.max(0, Math.min(songCount - 1, currentIndex + offset))
}

export function parseStageSongIndex(value: string) {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const index = Number(value)

  return Number.isSafeInteger(index) && index <= 999
    ? index
    : null
}
