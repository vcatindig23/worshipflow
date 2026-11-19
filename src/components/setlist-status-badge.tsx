type SetlistStatus = "draft" | "published" | "archived"

const statusPresentation: Record<
  SetlistStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "wf-status-neutral",
  },
  published: {
    label: "Published",
    className: "wf-status-success",
  },
  archived: {
    label: "Archived",
    className: "wf-status-warning",
  },
}

export default function SetlistStatusBadge({
  status,
}: {
  status: SetlistStatus
}) {
  const presentation = statusPresentation[status]

  return (
    <span className={`wf-status ${presentation.className}`}>
      {presentation.label}
    </span>
  )
}
