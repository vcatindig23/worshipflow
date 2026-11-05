import Image from "next/image"
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock3,
  Users,
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TeamInvitationStatus = "pending" | "accepted" | "revoked" | "expired" | "failed"

export type TeamInvitationProps = {
  email: string
  organizationName: string
  roleLabel: string
  createdAt: string
  expiresAt: string
  status?: TeamInvitationStatus
  avatarSrc?: string | null
  actions?: ReactNode
  className?: string
}

function formatInvitationDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(date)
}

const statusPresentation: Record<
  TeamInvitationStatus,
  { label: string; detail: string; className: string; icon: typeof Clock3 }
> = {
  pending: {
    label: "Invited",
    detail: "Waiting for the invitee to accept the invitation.",
    className: "wf-status-neutral",
    icon: Clock3,
  },
  accepted: {
    label: "Accepted",
    detail: "The invited person has joined the church workspace.",
    className: "wf-status-success",
    icon: CheckCircle2,
  },
  revoked: {
    label: "Revoked",
    detail: "This invitation code is no longer active.",
    className: "wf-status-neutral",
    icon: Ban,
  },
  expired: {
    label: "Expired",
    detail: "The seven-day invitation window has ended. Create a new invitation to invite this person.",
    className: "wf-status-warning",
    icon: AlertCircle,
  },
  failed: {
    label: "Failed",
    detail: "The invitation was not created. Review the error and try again.",
    className: "wf-status-danger",
    icon: AlertCircle,
  },
}

/**
 * Invitation lifecycle presentation. A pending record whose expiry date has
 * passed is displayed as expired even if the database has not yet refreshed
 * its status column.
 */
export function TeamInvitation({
  email,
  organizationName,
  roleLabel,
  createdAt,
  expiresAt,
  status = "pending",
  avatarSrc,
  actions,
  className,
}: TeamInvitationProps) {
  const effectiveStatus: TeamInvitationStatus =
    status === "pending" && new Date(expiresAt).getTime() <= Date.now()
      ? "expired"
      : status
  const presentation = statusPresentation[effectiveStatus]
  const StatusIcon = presentation.icon

  return (
    <article
      aria-label={`Invitation for ${email}`}
      className={cn(
        "relative w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <Users aria-hidden="true" className="size-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Team Invitation
              </p>
              <p className="mt-0.5 break-words text-[13px] leading-5 text-[var(--muted)]">
                Invitation created for{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {email}
                </span>{" "}
                to join{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {organizationName}
                </span>
                .
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              <span className={`wf-status h-8 rounded-lg px-2.5 ${presentation.className}`}>
                <StatusIcon aria-hidden="true" className="size-3.5" />
                {presentation.label}
              </span>
              {effectiveStatus === "pending" ? actions : null}
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            {presentation.detail}
          </p>
        </div>
      </div>

      <div className="ml-0 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)] sm:ml-14">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Created {formatInvitationDate(createdAt)}
        </span>
        <span>
          {effectiveStatus === "accepted" ? "Expires" : "Expires"} {formatInvitationDate(expiresAt)}
        </span>
        <span className="rounded-md border border-[var(--border)] px-2 py-1 font-medium text-[var(--foreground)]">
          {roleLabel}
        </span>
      </div>
    </article>
  )
}

export default TeamInvitation
