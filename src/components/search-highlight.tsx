import { splitGlobalSearchText } from "@/lib/global-search"

export default function SearchHighlight({
  value,
  query,
}: {
  value: string
  query: string
}) {
  const segments = splitGlobalSearchText(value, query)

  return (
    <>
      {segments.map((segment, index) =>
        segment.matched ? (
          <mark
            key={index}
            className="rounded bg-[var(--warning-soft)] px-0.5 text-inherit"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  )
}
