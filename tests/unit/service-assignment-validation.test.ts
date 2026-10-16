import { describe, expect, it } from "vitest"
import {
  assignmentResponseStatusSchema,
  setlistAssignmentResponseSchema,
} from "../../src/lib/service-assignment-validation"

const validAssignmentId = "f1d2d2f9-2a9d-4f8e-a6c0-2c5ce44f3a10"

describe("service assignment response validation", () => {
  it("accepts a confirmed response with a trimmed note", () => {
    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "confirmed",
        responseNote: "  I will be there  ",
      })
    ).toMatchObject({
      success: true,
      data: {
        assignmentId: validAssignmentId,
        status: "confirmed",
        responseNote: "I will be there",
      },
    })
  })

  it("accepts declined responses and empty notes", () => {
    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "declined",
        responseNote: "",
      })
    ).toMatchObject({
      success: true,
      data: {
        status: "declined",
        responseNote: "",
      },
    })
  })

  it("allows only the two supported response states", () => {
    expect(assignmentResponseStatusSchema.safeParse("confirmed").success).toBe(true)
    expect(assignmentResponseStatusSchema.safeParse("declined").success).toBe(true)
    expect(assignmentResponseStatusSchema.safeParse("pending").success).toBe(false)
    expect(assignmentResponseStatusSchema.safeParse("admin").success).toBe(false)
    expect(assignmentResponseStatusSchema.safeParse("CONFIRMED").success).toBe(false)
  })

  it("rejects malformed IDs and unrecognized response states", () => {
    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: "../../another-user",
        status: "confirmed",
        responseNote: "",
      }).success
    ).toBe(false)

    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "pending",
        responseNote: "",
      }).success
    ).toBe(false)
  })

  it("enforces the 500-character response-note limit", () => {
    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "declined",
        responseNote: "x".repeat(500),
      }).success
    ).toBe(true)

    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "declined",
        responseNote: "x".repeat(501),
      }).success
    ).toBe(false)
  })

  it("rejects values with incorrect runtime types", () => {
    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: validAssignmentId,
        status: "confirmed",
        responseNote: 42,
      }).success
    ).toBe(false)

    expect(
      setlistAssignmentResponseSchema.safeParse({
        assignmentId: null,
        status: "confirmed",
      }).success
    ).toBe(false)
  })
})
