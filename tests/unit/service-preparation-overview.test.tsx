import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import ServicePreparationChecklist from "@/app/setlists/[id]/service-preparation-checklist"
import { getServiceReadiness } from "@/lib/service-readiness"

describe("service preparation overview", () => {
  it("separates blocking essentials from optional run-of-show guidance", () => {
    const readiness = getServiceReadiness(
      { service_date: "2026-11-08", service_time: "09:00" },
      2,
      [
        { confirmation_status: "confirmed" },
        { confirmation_status: "pending" },
      ]
    )
    const markup = renderToStaticMarkup(
      <ServicePreparationChecklist
        setlistId="service-1"
        serviceDate="2026-11-08"
        serviceTime="09:00"
        songCount={2}
        readiness={readiness}
        teamAssignments={[
          {
            memberName: "Alex",
            teamPosition: "Drummer",
            confirmation_status: "confirmed",
            availability: { status: "unavailable", label: "Unavailable · time off" },
          },
          {
            memberName: "Sam",
            teamPosition: "Vocalist",
            confirmation_status: "pending",
            availability: { status: "within_weekly_hours", label: "Within usual hours" },
          },
        ]}
        availabilityChecksAvailable
        timeline={{ itemCount: 2, unlinkedSongCount: 1, untimedItemCount: 1 }}
        resourceCount={0}
        hasServiceNotes={false}
        hasAnnouncements={false}
        canEdit
        isCompleted={false}
      />
    )

    expect(markup).toContain("Service preparation overview")
    expect(markup).toContain("Blocking essentials")
    expect(markup).toContain("Recommended preparation")
    expect(markup).toContain("2 of 4 essentials complete")
    expect(markup).toContain("1 unavailable")
    expect(markup).toContain("Alex")
    expect(markup).toContain("Drummer")
    expect(markup).toContain("1 song item is not linked to a setlist chart.")
    expect(markup).toContain("1 item has no planned duration.")
    expect(markup).toContain('href="#worship-team"')
    expect(markup).toContain('href="#service-timeline"')
  })

  it("does not render a misleading availability panel when no members are assigned", () => {
    const readiness = getServiceReadiness(
      { service_date: null, service_time: null },
      0,
      []
    )
    const markup = renderToStaticMarkup(
      <ServicePreparationChecklist
        setlistId="service-2"
        serviceDate={null}
        serviceTime={null}
        songCount={0}
        readiness={readiness}
        teamAssignments={[]}
        availabilityChecksAvailable
        timeline={{ itemCount: 0, unlinkedSongCount: 0, untimedItemCount: 0 }}
        resourceCount={0}
        hasServiceNotes={false}
        hasAnnouncements={false}
        canEdit
        isCompleted={false}
      />
    )

    expect(markup).toContain("Assign team members to their worship-team positions.")
    expect(markup).not.toContain("Team availability")
  })
})
