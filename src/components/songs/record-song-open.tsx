"use client"

import { useEffect } from "react"
import { recordSongOpen } from "@/app/songs/actions"

type RecordSongOpenProps = {
  songId: string
}

export default function RecordSongOpen({
  songId,
}: RecordSongOpenProps) {
  useEffect(() => {
    void recordSongOpen(songId)
  }, [songId])

  return null
}