import { CheckCircle2, CircleAlert, Info } from "lucide-react"
import type { ReactNode } from "react"

export function Feedback({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: "success" | "error" | "info"
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "error" ? CircleAlert : Info
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`wf-feedback wf-feedback-${tone}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children ? (
          <div className="mt-1 text-sm leading-6">{children}</div>
        ) : null}
        {actions ? (
          <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
