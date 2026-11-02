const MAX_SEARCH_LENGTH = 100

export type SearchTextSegment = {
  text: string
  matched: boolean
}

export function normalizeGlobalSearchQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH)
}

export function toSearchPattern(query: string) {
  const escapedQuery = query.replace(/[\\%_]/g, "\\$&")
  return \`%\${escapedQuery}%\`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&")
}

/** Split display text into safe text and highlighted query matches. */
export function splitGlobalSearchText(
  value: string,
  rawQuery: string
): SearchTextSegment[] {
  const terms = normalizeGlobalSearchQuery(rawQuery)
    .split(/\\s+/)
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)

  if (terms.length === 0 || value.length === 0) {
    return [{ text: value, matched: false }]
  }

  const matcher = new RegExp(\`(\${terms.map(escapeRegExp).join("|")})\`, "gi")
  const segments: SearchTextSegment[] = []
  let previousEnd = 0

  for (const match of value.matchAll(matcher)) {
    const start = match.index ?? 0
    const matchedText = match[0]
    if (start > previousEnd) {
      segments.push({ text: value.slice(previousEnd, start), matched: false })
    }
    segments.push({ text: matchedText, matched: true })
    previousEnd = start + matchedText.length
  }

  if (previousEnd < value.length) {
    segments.push({ text: value.slice(previousEnd), matched: false })
  }

  return segments.length > 0
    ? segments
    : [{ text: value, matched: false }]
}

export function getGlobalSearchOptionId(key: string) {
  return \`global-search-option-\${key.replace(/[^a-z0-9_-]/gi, "-")}\`
}
