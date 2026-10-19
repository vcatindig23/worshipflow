import { describe, expect, it } from "vitest"
import { assignmentSwapRequestSchema } from "../../src/lib/assignment-swap-validation"

const validAssignmentId = "f1d2d2f9-2a9d-4f8e-a6c0-2c5ce44f3a10"
const validSubstituteId = "2f5c4b0a-6d17-4e88-9b6a-3d8b7e2c1f40"

describe("assignment swap request validation", () => {
  it("accepts valid IDs and trims the optional reason", () => {
    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: "  I have a schedule conflict.  ",
      })
    ).toMatchObject({
      success: true,
      data: {
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: "I have a schedule conflict.",
      },
    })
  })

  it("accepts an empty reason", () => {
    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: "",
      })
    ).toMatchObject({
      success: true,
      data: { reason: "" },
    })
  })

  it("rejects malformed assignment and substitute IDs", () => {
    for (const assignmentId of ["", "../another-assignment", null]) {
      expect(
        assignmentSwapRequestSchema.safeParse({
          assignmentId,
          substituteUserId: validSubstituteId,
          reason: "",
        }).success
      ).toBe(false)
    }

    for (const substituteUserId of ["", "not-a-uuid", null]) {
      expect(
        assignmentSwapRequestSchema.safeParse({
          assignmentId: validAssignmentId,
          substituteUserId,
          reason: "",
        }).success
      ).toBe(false)
    }
  })

  it("enforces the 500-character reason limit after trimming", () => {
    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: "x".repeat(500),
      }).success
    ).toBe(true)

    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: "x".repeat(501),
      }).success
    ).toBe(false)

    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: `  ${"x".repeat(500)}  `,
      }).success
    ).toBe(true)
  })

  it("rejects a missing or non-string reason", () => {
    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
      }).success
    ).toBe(false)

    expect(
      assignmentSwapRequestSchema.safeParse({
        assignmentId: validAssignmentId,
        substituteUserId: validSubstituteId,
        reason: 123,
      }).success
    ).toBe(false)
  })
})
