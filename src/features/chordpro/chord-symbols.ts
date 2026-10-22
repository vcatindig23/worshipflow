const NOTE = "[A-Ga-g](?:[#b♯♭])?"

function normalizeNote(value: string) {
  return value.replace("♯", "#").replace("♭", "b")
}

function isNote(value: string) {
  return new RegExp(`^${NOTE}$`).test(normalizeNote(value))
}

const suffixTokens = [
  /^(?:maj|min|dim|aug|sus|add|omit|no|alt|dom)/i,
  /^(?:Δ|ø|°|\+|-|M|m)/,
  /^(?:b|#)(?:13|11|9|7|6|5|4|2)/i,
  /^(?:13|11|9|7|6|5|4|2)/,
  /^\((?:b|#)?(?:5|9|11|13)(?:,(?:b|#)?(?:5|9|11|13))*\)/i,
]

/** Parse common chord symbols without pretending unsupported spellings are valid. */
export function isValidChordSymbol(input: string): boolean {
  const chord = input.trim().replace(/[♯♭]/g, (mark) => mark === "♯" ? "#" : "b")
  if (!chord || chord.length > 48 || /\s/.test(chord)) return false

  // ChordPro allows custom names through {define: NAME ...} directives.
  if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(chord) && !isNote(chord)) return false

  const rootMatch = chord.match(/^([A-Ga-g](?:[#b])?)(.*)$/)
  if (!rootMatch || !isNote(rootMatch[1] ?? "")) return false

  let suffix = rootMatch[2] ?? ""
  let bass = ""

  // Preserve the common compound extension 6/9; other slash forms are inversions.
  if (!/6\/9$/.test(suffix) && suffix.includes("/")) {
    const slash = suffix.indexOf("/")
    bass = suffix.slice(slash + 1)
    suffix = suffix.slice(0, slash)
    if (!isNote(bass)) return false
  }

  if ((suffix.includes("/") && !/6\\/9$/.test(suffix)) || /[^A-Za-z0-9#+()°øΔ/-]/.test(suffix)) return false
  if (suffix.includes("(") !== suffix.includes(")")) return false

  let remaining = suffix
  while (remaining.length > 0) {
    const token = suffixTokens.find((pattern) => pattern.test(remaining))
    if (token) {
      remaining = remaining.replace(token, "")
      continue
    }

    // Bare root is valid; quality/extension digits can appear together (m7, 7sus4).
    if (/^\d+/.test(remaining)) {
      const number = remaining.match(/^\d+/)?.[0] ?? ""
      if (!["2", "4", "5", "6", "7", "9", "11", "13"].includes(number)) return false
      remaining = remaining.slice(number.length)
      continue
    }

    return false
  }

  return true
}
