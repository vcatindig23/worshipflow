import Image from "next/image"
import {
  Check,
  Clock3,
  Users,
} from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type TeamInvitationProps = {
  email: string
  organizationName: string
  roleLabel: string
  createdAt: string
  expiresAt: string
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
  avatarSrc,
  actions,
  className,
}: TeamInvitationProps) {
  return (
    <article
      aria-label={\`Invitation for \${email}\`}
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
                Invitation sent to{" "}
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
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand-soft)] px-2.5 text-xs font-semibold text-[var(--brand)]">
                <Check aria-hidden="true" className="size-3.5" />
                Sent
              </span>
              {actions}
            </div>
          </div>
        </div>
      </div>

      <div className="ml-0 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)] sm:ml-14">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Invited {formatInvitationDate(createdAt)}
        </span>
        <span>
          Expires {formatInvitationDate(expiresAt)}
        </span>
        <span className="rounded-md border border-[var(--border)] px-2 py-1 font-medium text-[var(--foreground)]">
          {roleLabel}
        </span>
      </div>
    </article>
  )
}

export default TeamInvitation
