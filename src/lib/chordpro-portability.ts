import {
  getChordProMetadata,
  validateChordPro,
} from "../features/chordpro/parser"

export const MAX_CHORDPRO_FILE_BYTES = 500_000

const chordProExtensions = new Set([".cho", ".chopro", ".chordpro"])

export function validateChordProImport(
  fileName: string,
  fileSize: number,
  source: string
) {
  const extension = fileName
    .slice(fileName.lastIndexOf("."))
    .toLowerCase()

  if (!chordProExtensions.has(extension)) {
    return {
      valid: false,
      error: "Choose a .cho, .chopro, or .chordpro file.",
    }
  }

  if (
    !Number.isSafeInteger(fileSize) ||
    fileSize < 0 ||
    fileSize > MAX_CHORDPRO_FILE_BYTES
  ) {
    return {
      valid: false,
      error: "ChordPro files must be 500 KB or smaller.",
    }
  }

  if (!source.trim()) {
    return {
      valid: false,
      error: "The selected file is empty.",
    }
  }

  const validation = validateChordPro(source)

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.errors[0] ?? "The ChordPro file is invalid.",
    }
  }

  return {
    valid: true,
    error: null,
  }
}

function directiveValue(value: string) {
  return value.replace(/[{}\r\n]/g, "").trim()
}

export function buildChordProExport(
  source: string,
  title: string,
  artist: string | null
) {
  const missingMetadata: string[] = []

  if (!getChordProMetadata(source, "title")) {
    missingMetadata.push(`{title: ${directiveValue(title)}}`)
  }

  if (artist && !getChordProMetadata(source, "artist")) {
    missingMetadata.push(`{artist: ${directiveValue(artist)}}`)
  }

  const normalizedSource = source.replace(/\r\n?/g, "\n").trimEnd()
  const content = [...missingMetadata, normalizedSource]
    .filter(Boolean)
    .join("\n")

  return `${content}\n`
}

export function getChordProDownloadName(title: string) {
  const filename = title
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)

  return `${filename || "song"}.cho`
}
