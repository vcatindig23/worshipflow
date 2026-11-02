const MAX_SEARCH_LENGTH = 100

export function normalizeGlobalSearchQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH)
}

export function toSearchPattern(query: string) {
  const escapedQuery = query.replace(/[\\%_]/g, "\\$&")
  return `%${escapedQuery}%`
}

export type SearchHighlightPart = {
  text: string
  match: boolean
}

/** Split display text into safe, case-insensitive query matches for highlighting. */
export function splitSearchHighlights(value: string, query: string): SearchHighlightPart[] {
  const terms = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)))
  if (terms.length === 0) return [{ text: value, match: false }]

  const escapedTerms = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  )
  const expression = new RegExp("(" + escapedTerms.join("|") + ")", "gi")

  return value.split(expression).filter(Boolean).map((text) => ({
    text,
    match: terms.some((term) => text.toLocaleLowerCase() === term.toLocaleLowerCase()),
  }))
}
