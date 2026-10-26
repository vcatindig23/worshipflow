"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, House } from "lucide-react"

const labels: Record<string, string> = {
  songs: "Songs",
  setlists: "Setlists",
  services: "Services",
  files: "Files",
  settings: "Settings",
  security: "Account security",
  team: "Team",
  profile: "Profile",
  church: "Church settings",
  "my-schedule": "My schedule",
  notifications: "Notifications",
  activity: "Activity",
  templates: "Templates",
  history: "Service history",
  insights: "Insights",
  new: "Create",
  edit: "Edit",
  complete: "Complete service",
  preparation: "Preparation",
  versions: "Versions",
  search: "Search",
}
export default function WorkspaceBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  if (!segments.length) return null
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs leading-6 text-[var(--muted)]"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-[var(--foreground)]"
          >
            <House className="size-3.5" aria-hidden="true" />
            Dashboard
          </Link>
        </li>
        {segments.map((segment, index) => (
          <li key={index} className="inline-flex min-w-0 items-center gap-2">
            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
            {index === segments.length - 1 || segment === "versions" ? (
              <span
                aria-current={
                  index === segments.length - 1 ? "page" : undefined
                }
                className="font-medium text-[var(--foreground)]"
              >
                {labels[segment] ?? "Details"}
              </span>
            ) : (
              <Link
                href={"/" + segments.slice(0, index + 1).join("/")}
                className="hover:text-[var(--foreground)]"
              >
                {labels[segment] ?? "Details"}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
