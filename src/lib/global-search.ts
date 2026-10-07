const MAX_SEARCH_LENGTH = 100

export function normalizeGlobalSearchQuery(value: string | undefined) {
  return (value ?? "").trim().slice(0, MAX_SEARCH_LENGTH)
}

export function toSearchPattern(query: string) {
  const escapedQuery = query.replace(/[\\%_]/g, "\\$&")
  return `%${escapedQuery}%`
}
