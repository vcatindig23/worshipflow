import { z } from "zod"

const requestIdSchema = z.string().uuid()
const responseNoteSchema = z.string().trim().max(500)

/**
 * Validate a substitute's response to a pending assignment-swap request.
 * The server action still verifies that the signed-in user is the intended substitute.
 */
export const assignmentSwapResponseSchema = z.object({
  requestId: requestIdSchema,
  decision: z.enum(["accept", "decline"]),
  responseNote: responseNoteSchema,
})

/**
 * Validate a worship leader's decision on an accepted swap request.
 * The server action still checks the leader role and workspace ownership.
 */
export const assignmentSwapResolutionSchema = z.object({
  requestId: requestIdSchema,
  decision: z.enum(["approve", "decline"]),
  resolutionNote: responseNoteSchema,
})
