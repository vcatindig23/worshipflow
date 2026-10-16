import { z } from "zod"

export const assignmentResponseStatusSchema = z.enum([
  "confirmed",
  "declined",
])

export const setlistAssignmentResponseSchema = z.object({
  assignmentId: z.string().uuid(),
  status: assignmentResponseStatusSchema,
  responseNote: z.string().trim().max(500).optional(),
})
