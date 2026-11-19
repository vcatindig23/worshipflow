import { z } from "zod"

const validTimezone = z.string().trim().min(1).max(100).refine((timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone })
    return true
  } catch {
    return false
  }
}, "Choose a valid time zone.")

export const availabilityEntrySchema = z.object({
  entryType: z.enum(["blockout", "recurring"]),
  title: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(500).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  timezone: validTimezone,
}).superRefine((entry, ctx) => {
  if (entry.entryType === "blockout") {
    if (!entry.startsOn || !entry.endsOn || entry.endsOn < entry.startsOn) {
      ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Choose a valid date range." })
    }
    if (entry.startsOn && entry.endsOn && entry.endsOn >= entry.startsOn) {
      const start = new Date(`${entry.startsOn}T00:00:00Z`)
      const end = new Date(`${entry.endsOn}T00:00:00Z`)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ||
          start.toISOString().slice(0, 10) !== entry.startsOn ||
          end.toISOString().slice(0, 10) !== entry.endsOn) {
        ctx.addIssue({ code: "custom", path: ["startsOn"], message: "Choose real calendar dates." })
      }
    }
  } else {
    if (!entry.weekdays?.length || new Set(entry.weekdays).size !== entry.weekdays.length) {
      ctx.addIssue({ code: "custom", path: ["weekdays"], message: "Choose at least one day." })
    }
    if (!entry.startTime || !entry.endTime || entry.startTime >= entry.endTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Choose a valid time range." })
    }
  }
})

export type AvailabilityEntryInput = z.infer<typeof availabilityEntrySchema>
