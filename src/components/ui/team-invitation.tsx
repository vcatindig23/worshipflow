import Image from "next/image"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Users,
  XCircle,
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TeamInvitationProps = {
  email: string
  organizationName: string
  roleLabel: string
  createdAt: string
  expiresAt: string
  status: "pending" | "accepted" | "expired" | "revoked"
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

/**
 * A reusable invitation card for invitations a church administrator has sent.
 * Action controls are supplied by the parent so this presentation component
 * does not invent invitation acceptance or revocation behavior.
 */
export function TeamInvitation({
  email,
  organizationName,
  roleLabel,
  createdAt,
  expiresAt,
  status,
  avatarSrc,
  actions,
  className,
}: TeamInvitationProps) {
  const isExpired = status === "pending" && new Date(expiresAt).getTime() <= Date.now()
  const displayStatus = isExpired ? "expired" : status
  const statusLabel = displayStatus === "accepted"
    ? "Accepted"
    : displayStatus === "expired"
      ? "Expired"
      : displayStatus === "revoked"
        ? "Revoked"
        : "Pending"
  const statusClass = displayStatus === "accepted"
    ? "wf-status-success"
    : displayStatus === "expired"
      ? "wf-status-danger"
      : displayStatus === "revoked"
        ? "wf-status-neutral"
        : "wf-status-warning"
  const statusDescription = displayStatus === "accepted"
    ? "This invitation was accepted."
    : displayStatus === "expired"
      ? "This invitation has expired. Create a new invitation if they still need access."
      : displayStatus === "revoked"
        ? "This invitation was revoked and can no longer be used."
        : "Invitation sent; waiting for the member to accept."

  return (
    <article
      aria-label={`Invitation for ${email}`}
      className={cn(
        "relative w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_1px_6px_0_rgba(0,0,0,0.02)]",
        className,
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
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
                Invitation for{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {email}
                </span>{" "}
                to join{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {organizationName}
                </span>
                .
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{statusDescription}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              <span className={`wf-status ${statusClass} h-8 rounded-lg px-2.5`}>
                {displayStatus === "accepted" ? (
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                ) : displayStatus === "expired" ? (
                  <AlertTriangle aria-hidden="true" className="size-3.5" />
                ) : displayStatus === "revoked" ? (
                  <XCircle aria-hidden="true" className="size-3.5" />
                ) : (
                  <Clock3 aria-hidden="true" className="size-3.5" />
                )}
                {statusLabel}
              </span>
              {actions}
            </div>
          </div>
        </div>
      </div>

      <div className="ml-0 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)] sm:ml-14">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Created {formatInvitationDate(createdAt)}
        </span>
        <span>
          {displayStatus === "expired" ? "Expired" : "Expires"} {formatInvitationDate(expiresAt)}
        </span>
        <span className="rounded-md border border-[var(--border)] px-2 py-1 font-medium text-[var(--foreground)]">
          {roleLabel}
        </span>
      </div>
    </article>
  )
}

export default TeamInvitation
