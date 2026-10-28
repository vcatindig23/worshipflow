import { describe, expect, it } from "vitest"
import { generateGuitarShapes } from "../src/lib/chord-chart/guitar-shapes"

describe("guitar chord positions", () => {
  it("uses standard low-E-to-high-e string order for a C major open shape", () => {
    const shapes = generateGuitarShapes(0, [0, 4, 7], "major")
    const openCShape = shapes.find(
      (shape) => shape.frets.join(",") === ",3,2,0,1,0"
    )

    expect(openCShape).toBeDefined()
    expect(openCShape?.bassPitchClass).toBe(0)
    expect(openCShape?.notes.map((note) => note.pitchClass)).toEqual([
      0, 4, 7, 0, 4,
    ])
    expect(openCShape?.fingers).toEqual([0, 3, 2, 0, 1, 0])
  })

  it("keeps reference voicings within the selected chord tones", () => {
    const intervals = [0, 4, 7, 10]
    const expectedTones = new Set(intervals.map((interval) => interval % 12))
    const shapes = generateGuitarShapes(0, intervals, "dominant-seven")

    expect(shapes.length).toBeGreaterThan(0)
    for (const shape of shapes) {
      expect(shape.reference).toBe(true)
      expect(shape.frets).toHaveLength(6)
      expect(shape.notes.every((note) => expectedTones.has(note.pitchClass))).toBe(
        true
      )
      expect(shape.notes.some((note) => note.pitchClass === 0)).toBe(true)
      expect(shape.frets.some((fret) => fret === null)).toBe(true)
    }
  })

  it("calculates fallback extended-chord positions with correct pitches", () => {
    const intervals = [0, 4, 7, 10, 14, 18]
    const expectedTones = new Set(intervals.map((interval) => interval % 12))
    const shapes = generateGuitarShapes(0, intervals, "seven-sharp-eleven")

    expect(shapes.length).toBeGreaterThan(0)
    for (const shape of shapes) {
      expect(shape.reference).toBe(false)
      expect(shape.notes.every((note) => expectedTones.has(note.pitchClass))).toBe(
        true
      )
      expect(shape.frets.every((fret) => fret === null || fret <= 15)).toBe(true)
    }
  })
})
