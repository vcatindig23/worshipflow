import { PageContainer } from "./ui/page"
import { Card, CardContent } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

export default function WorkspaceListSkeleton({
  label,
  grid = false,
}: {
  label: string
  grid?: boolean
}) {
  return (
    <PageContainer aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-32" />
      </div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div
        className={
          grid ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-4"
        }
      >
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <Skeleton className="h-5 w-3/5" />
              </div>
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <p role="status" className="sr-only">
        Loading {label}…
      </p>
    </PageContainer>
  )
}
