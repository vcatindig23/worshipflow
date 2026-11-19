import { Feedback } from "@/components/ui/feedback"
import { Input } from "@/components/ui/form-controls"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { ProtectedForm } from "@/components/ui/protected-form"
import {
  getServicePositionCoverage,
  serviceCoveragePositionLabels,
  type ServicePositionAssignment,
  type ServicePositionRequirement,
} from "@/lib/service-position-coverage"
import { saveSetlistPositionRequirements } from "@/app/setlists/actions"

type ServicePositionCoverageProps = {
  setlistId: string
  requirements: ServicePositionRequirement[]
  assignments: ServicePositionAssignment[]
  canEdit: boolean
  requirementsAvailable: boolean
}

export default function ServicePositionCoverage({
  setlistId,
  requirements,
  assignments,
  canEdit,
  requirementsAvailable,
}: ServicePositionCoverageProps) {
  const coverage = getServicePositionCoverage(requirements, assignments)
  const requirementsByPosition = new Map(
    requirements.map((requirement) => [
      requirement.team_position,
      requirement.required_count,
    ])
  )

  return (
    <section
      id="position-coverage"
      aria-labelledby="position-coverage-title"
      className="scroll-mt-6 wf-card space-y-4 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
            Scheduling
          </p>
          <h2
            id="position-coverage-title"
            className="mt-1 text-base font-semibold text-[var(--foreground)]"
          >
            Team coverage
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Set how many people this service needs in each position, then track
            assigned, confirmed, and open spots.
          </p>
        </div>
        {coverage ? (
          <span className="wf-status wf-status-neutral shrink-0">
            {coverage.filledSlots} / {coverage.requiredSlots} staffed
          </span>
        ) : null}
      </div>

      {!requirementsAvailable ? (
        <Feedback tone="warning" title="Position coverage is unavailable">
          Apply the service-position-coverage migration and refresh the database
          schema cache to configure staffing requirements.
        </Feedback>
      ) : null}

      {coverage ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {coverage.filledSlots} of {coverage.requiredSlots} positions staffed
            </p>
            <p className="text-xs font-semibold tabular-nums text-[var(--muted)]">
              {coverage.percentage}%
            </p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]"
            role="progressbar"
            aria-label="Team position coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={coverage.percentage}
          >
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-transform motion-reduce:transition-none"
              style={{ transform: `scaleX(${coverage.percentage / 100})`, transformOrigin: "left" }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
            <span>{coverage.confirmedSlots} confirmed</span>
            <span>{coverage.pendingAssignments} pending</span>
            <span>{coverage.vacantSlots} vacant</span>
            {coverage.declinedAssignments > 0 ? (
              <span className="font-medium text-[var(--danger)]">
                {coverage.declinedAssignments} declined
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            No staffing requirements set
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Add the positions this service needs. Services without requirements
            keep their existing readiness behavior.
          </p>
        </div>
      )}

      {coverage ? (
        <ul className="divide-y divide-[var(--border)]">
          {coverage.rows.map((row) => (
            <li
              key={row.teamPosition}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {row.label}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {row.confirmed} confirmed · {row.pending} pending · {row.declined} declined
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
                  {row.assigned} / {row.required}
                </span>
                {row.vacant > 0 ? (
                  <span className="wf-status wf-status-warning">
                    {row.vacant} vacant
                  </span>
                ) : (
                  <span className="wf-status wf-status-success">
                    Covered
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {canEdit && requirementsAvailable ? (
        <div className="border-t border-[var(--border)] pt-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Required team positions
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Enter 0 for positions this service does not need. Guitarists
              includes lead, rhythm, acoustic, and electric guitar assignments.
            </p>
          </div>
          <ProtectedForm action={saveSetlistPositionRequirements} className="space-y-4">
            <input type="hidden" name="setlistId" value={setlistId} />
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(serviceCoveragePositionLabels).map(([position, label]) => (
                <label
                  key={position}
                  htmlFor={`required-${position}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5"
                >
                  <span className="min-w-0 text-sm font-medium text-[var(--foreground)]">
                    {label}
                  </span>
                  <Input
                    id={`required-${position}`}
                    name={`required_${position}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    step={1}
                    defaultValue={requirementsByPosition.get(position) ?? 0}
                    aria-label={`Required number of ${label}`}
                    className="h-10 w-20 shrink-0 text-center tabular-nums"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p className="mr-auto text-xs text-[var(--muted)]">
                Up to 20 people per position
              </p>
              <FormSubmitButton pendingText="Saving coverage…">
                Save requirements
              </FormSubmitButton>
            </div>
          </ProtectedForm>
        </div>
      ) : null}
    </section>
  )
}
