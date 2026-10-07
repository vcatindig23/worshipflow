import { describe, expect, it } from "vitest"
import {
  getChordDiagram,
  getChordRootLabel,
} from "../../../src/features/chordpro/chord-diagrams"

describe("guitar chord diagrams", () => {
  it("returns a first-position open C shape", () => {
    expect(getChordDiagram("C")).toEqual({
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
    })
  })

  it("supports slash chords using the root chord shape", () => {
    expect(getChordDiagram("D/F#")?.frets).toEqual([
      -1, -1, 0, 2, 3, 2,
    ])
    expect(getChordRootLabel("D/F#")).toBe("D")
  })

  it("creates a movable barre shape for transposed chord roots", () => {
    const shape = getChordDiagram("F#m7")

    expect(shape?.baseFret).toBe(2)
    expect(shape?.frets).toEqual([2, 4, 2, 2, 2, 2])
    expect(shape?.fingers).toHaveLength(6)
  })

  it("does not show a misleading diagram for unsupported chord qualities", () => {
    expect(getChordDiagram("Cdim7")).toBeNull()
    expect(getChordDiagram("not-a-chord")).toBeNull()
  })
})
