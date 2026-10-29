import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import ChordProLine from "../../../src/components/songs/chordpro-line"
import { parseChordPro } from "../../../src/features/chordpro/parser"
import { buildSongDisplayLines } from "../../../src/features/chordpro/render"

describe("ChordPro line rendering", () => {
  const line = parseChordPro("[G]Amazing [C]grace").lines[0]

  if (!line || line.type !== "content") {
    throw new Error("Expected a ChordPro content line.")
  }

  it("renders chord labels above their lyric anchors without taking lyric width", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordProLine, {
        line,
        fontSize: 24,
        showChords: true,
      })
    )

    expect(markup).toContain("absolute left-0")
    expect(markup).toContain("h-0 w-0")
    expect(markup).toContain(">G</button>")
    expect(markup).toContain(">C</button>")
    expect(markup).toContain('aria-label="Show G chord diagram"')
    expect(markup.indexOf(">Amazing </span>")).toBeLessThan(
      markup.indexOf(">grace</span>")
    )
  })

  it("uses responsive projection sizing for stage-mode lyrics and chords", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordProLine, {
        line,
        fontSize: 44,
        showChords: true,
        stageMode: true,
      })
    )

    expect(markup).toContain("w-full whitespace-pre-wrap")
    expect(markup).toContain("text-justify [text-align-last:justify]")
    expect(markup).toContain("font-size:clamp(32px, 3.08vw, 70px)")
    expect(markup).toContain("padding-top:clamp(40px, 3.96vw, 79px)")
    expect(markup).toContain("font-size:clamp(23px, 2.29vw, 49px)")
    expect(markup).toContain("bottom:clamp(24px, 2.86vw, 46px)")
  })

  it("removes chord anchors and chord-row spacing when chords are hidden", () => {
    const markup = renderToStaticMarkup(
      createElement(ChordProLine, {
        line,
        fontSize: 24,
        showChords: false,
      })
    )

    expect(markup).not.toContain("h-0 w-0")
    expect(markup).not.toContain(">G</button>")
    expect(markup).not.toContain(">C</button>")
    expect(markup).toContain(">Amazing </span><span>grace</span>")
    expect(markup).not.toContain("padding-top")
  })

  it("spaces chord-only progressions instead of collapsing their chord labels", () => {
    const progression = parseChordPro(
      "[D] [D/F#] [G] [Bm] [A] [G]"
    ).lines[0]

    if (!progression || progression.type !== "content") {
      throw new Error("Expected a chord progression line.")
    }

    const markup = renderToStaticMarkup(
      createElement(ChordProLine, {
        line: progression,
        fontSize: 36,
        showChords: true,
        stageMode: true,
      })
    )

    expect(markup).toContain("gap-x-4")
    expect(markup).toContain("md:justify-evenly lg:justify-between")
    expect(markup).toContain(">D/F#</button>")
    expect(markup).toContain(">Bm</button>")
    expect(markup).toContain(">A</button>")
  })

  it("omits chord-only progressions when chords are hidden", () => {
    const progression = parseChordPro("[D] [D/F#] [G]").lines[0]

    if (!progression || progression.type !== "content") {
      throw new Error("Expected a chord progression line.")
    }

    const markup = renderToStaticMarkup(
      createElement(ChordProLine, {
        line: progression,
        fontSize: 36,
        showChords: false,
      })
    )

    expect(markup).toBe("")
  })
})

describe("ChordPro numbered section rendering", () => {
  it("preserves numbered verse headings and hides their end directives", () => {
    const parsed = parseChordPro(
      `{start_of_verse_1}\n[G]First verse\n{end_of_verse_1}\n{start_of_verse_2}\n[C]Second verse\n{end_of_verse_2}`
    )
    const displayLines = buildSongDisplayLines(parsed.lines)

    expect(
      displayLines
        .filter((line) => line.type === "section")
        .map((line) => line.title)
    ).toEqual(["Verse 1", "Verse 2"])
    expect(
      displayLines
        .filter((line) => line.type === "content")
        .map((line) =>
          line.line?.type === "content"
            ? line.line.tokens.map((token) => token.value).join("")
            : ""
        )
    ).toEqual(["GFirst verse", "CSecond verse"])
  })
})
