export type ChordToken = {
  type: "chord"
  value: string
}

export type TextToken = {
  type: "text"
  value: string
}

export type SongToken = ChordToken | TextToken

export type ContentLine = {
  type: "content"
  tokens: SongToken[]
}

export type DirectiveLine = {
  type: "directive"
  name: string
  value: string | null
}

export type BlankLine = {
  type: "blank"
}

export type SongLine = ContentLine | DirectiveLine | BlankLine

export type ParsedSong = {
  metadata: Record<string, string>
  lines: SongLine[]
}