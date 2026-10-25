import type { ComponentProps, ReactNode } from "react"
import WorkspaceBreadcrumbs from "@/components/workspace-breadcrumbs"
import { cn } from "@/lib/utils"

export function PageContainer({
  className,
  children,
  ...props
}: ComponentProps<"main">) {
  return (
    <main id="main-content" className={cn("wf-page", className)} {...props}>
      <WorkspaceBreadcrumbs />
      {children}
    </main>
  )
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  ...props
}: Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={cn("wf-page-header", className)} {...props}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="wf-eyebrow">{eyebrow}</p> : null}
        <h1 className="wf-page-title">{title}</h1>
        {description ? (
          <p className="wf-page-description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="wf-page-actions">{actions}</div> : null}
    </header>
  )
}
