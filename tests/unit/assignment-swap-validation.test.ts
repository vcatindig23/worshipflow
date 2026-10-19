import { describe, expect, it } from "vitest"
import {
  assignmentSwapResolutionSchema,
  assignmentSwapResponseSchema,
} from "../../src/lib/assignment-swap-validation"

const validRequestId = "f1d2d2f9-2a9d-4f8e-a6c0-2c5ce44f3a10"

describe("assignment swap response validation", () => {
  it("accepts an approved substitute response decision and trims its note", () => {
    expect(
      assignmentSwapResponseSchema.safeParse({
        requestId: validRequestId,
        decision: "accept",
        responseNote: "  I can cover this service.  ",
      })
    ).toMatchObject({
      success: true,
      data: {
        requestId: validRequestId,
        decision: "accept",
        responseNote: "I can cover this service.",
      },
    })
  })

  it("accepts a decline with an empty response note", () => {
    expect(
      assignmentSwapResponseSchema.safeParse({
        requestId: validRequestId,
        decision: "decline",
        responseNote: "",
      })
    ).toMatchObject({
      success: true,
      data: {
        decision: "decline",
        responseNote: "",
      },
    })
  })

  it("rejects malformed request IDs and unsupported decisions", () => {
    for (const requestId of ["", "../../another-request", null]) {
      expect(
        assignmentSwapResponseSchema.safeParse({
          requestId,
          decision: "accept",
          responseNote: "",
        }).success
      ).toBe(false)
    }

    for (const decision of ["approve", "pending", "cancel", "ACCEPT"]) {
      expect(
        assignmentSwapResponseSchema.safeParse({
          requestId: validRequestId,
          decision,
          responseNote: "",
        }).success
      ).toBe(false)
    }
  })

  it("enforces the 500-character response-note limit after trimming", () => {
    expect(
      assignmentSwapResponseSchema.safeParse({
        requestId: validRequestId,
        decision: "decline",
        responseNote: "x".repeat(500),
      }).success
    ).toBe(true)

    expect(
      assignmentSwapResponseSchema.safeParse({
        requestId: validRequestId,
        decision: "decline",
        responseNote: "x".repeat(501),
      }).success
    ).toBe(false)

    expect(
      assignmentSwapResponseSchema.safeParse({
        requestId: validRequestId,
        decision: "decline",
        responseNote: `  ${"x".repeat(500)}  `,
      }).success
    ).toBe(true)
  })
})

describe("assignment swap resolution validation", () => {
  it("accepts approval or decline and trims the resolution note", () => {
    expect(
      assignmentSwapResolutionSchema.safeParse({
        requestId: validRequestId,
        decision: "approve",
        resolutionNote: "  Approved after confirming coverage.  ",
      })
    ).toMatchObject({
      success: true,
      data: {
        requestId: validRequestId,
        decision: "approve",
        resolutionNote: "Approved after confirming coverage.",
      },
    })

    expect(
      assignmentSwapResolutionSchema.safeParse({
        requestId: validRequestId,
        decision: "decline",
        resolutionNote: "",
      }).success
    ).toBe(true)
  })

  it("rejects substitute-only decisions and notes over 500 characters", () => {
    for (const decision of ["accept", "pending", "cancel", "APPROVE"]) {
      expect(
        assignmentSwapResolutionSchema.safeParse({
          requestId: validRequestId,
          decision,
          resolutionNote: "",
        }).success
      ).toBe(false)
    }

    expect(
      assignmentSwapResolutionSchema.safeParse({
        requestId: validRequestId,
        decision: "approve",
        resolutionNote: "x".repeat(501),
      }).success
    ).toBe(false)
  })

  it("rejects non-string notes and malformed request IDs", () => {
    expect(
      assignmentSwapResolutionSchema.safeParse({
        requestId: "invalid",
        decision: "approve",
        resolutionNote: "",
      }).success
    ).toBe(false)

    expect(
      assignmentSwapResolutionSchema.safeParse({
        requestId: validRequestId,
        decision: "approve",
        resolutionNote: 42,
      }).success
    ).toBe(false)
  })
})
