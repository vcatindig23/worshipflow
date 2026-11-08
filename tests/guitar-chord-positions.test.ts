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
    expect(openCShape?.reference).toBe(true)
    expect(openCShape?.transposed).toBe(false)
  })

  it("transposes C reference shapes into C-sharp with recalculated fingering", () => {
    const shapes = generateGuitarShapes(1, [0, 4, 7], "major")
    const rootPosition = shapes.find(
      (shape) => shape.frets.join(",") === ",4,3,1,2,1"
    )

    expect(rootPosition).toBeDefined()
    expect(rootPosition).toMatchObject({
      frets: [null, 4, 3, 1, 2, 1],
      fingers: [0, 4, 3, 1, 2, 1],
      barres: [1],
      bassPitchClass: 1,
      reference: false,
      transposed: true,
    })
    expect(rootPosition?.notes.map((note) => note.pitchClass)).toEqual([
      1, 5, 8, 1, 5,
    ])
  })

  it("transposes F reference shapes into F-sharp with a valid barre", () => {
    const shapes = generateGuitarShapes(6, [0, 4, 7], "major")
    const rootPosition = shapes.find(
      (shape) => shape.frets.join(",") === "2,4,4,3,2,2"
    )
    const expectedTones = new Set([6, 10, 1])

    expect(rootPosition).toBeDefined()
    expect(rootPosition).toMatchObject({
      frets: [2, 4, 4, 3, 2, 2],
      fingers: [1, 3, 4, 2, 1, 1],
      barres: [2],
      bassPitchClass: 6,
      reference: false,
      transposed: true,
    })
    expect(
      rootPosition?.notes.every((note) => expectedTones.has(note.pitchClass))
    ).toBe(true)
    expect(rootPosition?.notes.map((note) => note.pitchClass)).toEqual([
      6, 1, 6, 10, 1, 6,
    ])
    expect(
      rootPosition?.frets.every((fret) => fret === null || fret <= 15)
    ).toBe(true)
  })

  it("orders available shapes by chord inversion rather than fret position", () => {
    const shapes = generateGuitarShapes(0, [0, 4, 7], "major")
    const firstOccurrenceByBass = new Map<number, number>()

    shapes.forEach((shape, index) => {
      if (!firstOccurrenceByBass.has(shape.bassPitchClass)) {
        firstOccurrenceByBass.set(shape.bassPitchClass, index)
      }
    })

    const inversionRanks = Array.from(firstOccurrenceByBass.keys()).map(
      (pitchClass) => [0, 4, 7].indexOf(pitchClass)
    )

    expect(inversionRanks[0]).toBe(0)
    expect(inversionRanks).toEqual(
      [...inversionRanks].sort((a, b) => a - b)
    )
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
      expect(shape.notes.length).toBeGreaterThanOrEqual(3)
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
