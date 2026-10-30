import { describe, expect, it } from "vitest"
import {
  assessMemberAvailability,
  type MemberAvailabilityEntry,
} from "../../src/lib/member-availability"

const userId = "member-1"

const blockout: MemberAvailabilityEntry = {
  user_id: userId,
  entry_type: "blockout",
  starts_on: "2026-11-01",
  ends_on: "2026-11-03",
  weekdays: null,
  start_time: null,
  end_time: null,
  timezone: "Asia/Manila",
}

const recurring: MemberAvailabilityEntry = {
  user_id: userId,
  entry_type: "recurring",
  starts_on: null,
  ends_on: null,
  weekdays: [0],
  start_time: "08:00:00",
  end_time: "12:00:00",
  timezone: "Asia/Manila",
}

const baseInput = {
  userId,
  serviceDate: "2026-11-01",
  serviceTime: "09:00:00",
  serviceEndTime: "10:00:00",
  serviceTimezone: "Asia/Manila",
}

describe("member availability assessment", () => {
  it("marks a service within an inclusive blockout date range as unavailable", () => {
    expect(
      assessMemberAvailability([blockout], baseInput).status
    ).toBe("unavailable")
  })

  it("uses recurring weekday and time windows to identify an available member", () => {
    expect(
      assessMemberAvailability([recurring], baseInput).status
    ).toBe("within_weekly_hours")
  })

  it("flags a service outside a member's recurring hours", () => {
    expect(
      assessMemberAvailability(
        [{ ...recurring, start_time: "10:00:00", end_time: "14:00:00" }],
        baseInput
      ).status
    ).toBe("outside_weekly_hours")
  })

  it("does not infer unavailability when a member has not submitted availability", () => {
    expect(
      assessMemberAvailability([], baseInput).status
    ).toBe("not_recorded")
  })

  it("asks for a service time when recurring availability exists but the service is untimed", () => {
    expect(
      assessMemberAvailability(
        [recurring],
        { ...baseInput, serviceTime: null }
      ).status
    ).toBe("needs_schedule")
  })

  it("uses the availability entry timezone when checking weekly hours", () => {
    const losAngelesAvailability: MemberAvailabilityEntry = {
      ...recurring,
      weekdays: [6],
      start_time: "19:00:00",
      end_time: "21:00:00",
      timezone: "America/Los_Angeles",
    }

    expect(
      assessMemberAvailability(
        [losAngelesAvailability],
        {
          ...baseInput,
          serviceTime: "10:00:00",
          serviceEndTime: "11:00:00",
          serviceDate: "2026-11-01",
          serviceTimezone: "Asia/Manila",
        }
      ).status
    ).toBe("within_weekly_hours")
  })

  it("does not expose another member's availability as the current member's status", () => {
    expect(
      assessMemberAvailability(
        [{ ...blockout, user_id: "another-member" }],
        baseInput
      ).status
    ).toBe("not_recorded")
  })

  it("uses a one-hour estimate when a valid service end time is not set", () => {
    expect(
      assessMemberAvailability(
        [recurring],
        { ...baseInput, serviceEndTime: null }
      ).status
    ).toBe("within_weekly_hours")
  })
})
