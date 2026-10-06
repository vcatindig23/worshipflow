export const teamPositionLabels: Record<string, string> = {
  worship_leader: "Worship Leader",
  singer: "Singer",
  lead_guitarist: "Lead Guitarist",
  rhythm_guitarist: "Rhythm Guitarist",
  acoustic_guitarist: "Acoustic Guitarist",
  electric_guitarist: "Electric Guitarist",
  bassist: "Bassist",
  keyboardist: "Keyboardist",
  pianist: "Pianist",
  drummer: "Drummer",
  percussionist: "Percussionist",
  violinist: "Violinist",
  cellist: "Cellist",
  sound_engineer: "Sound Engineer",
  audio_visual: "Audio / Visual",
  choir_member: "Choir Member",
  other: "Other",
}

export function getTeamPositionLabel(position: string) {
  return teamPositionLabels[position] ?? position
}
