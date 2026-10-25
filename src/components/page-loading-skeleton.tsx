import { Skeleton as SharedSkeleton } from "@/components/ui/skeleton"
type LoadingVariant =
  | "schedule"
  | "notifications"
  | "files"
  | "activity"
  | "profile"
  | "settings"
  | "service-detail"
  | "song-detail"
  | "live-stage"
  | "service-editor"
  | "service-history"
  | "service-insights";

type PageLoadingSkeletonProps = {
  variant: LoadingVariant;
};

function Skeleton({ className = "" }: { className?: string }) {
  const tone = className.includes("!bg-[#29362d]") ? "wf-skeleton-dark" : ""
  return <SharedSkeleton className={`${tone} ${className}`} />;
}

function PageHeading({ width = "w-56" }: { width?: string }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className={`h-8 max-w-full ${width}`} />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  );
}

function SkeletonRows({ count = 5, roomy = false }: { count?: number; roomy?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
          <Skeleton className={`shrink-0 rounded-xl ${roomy ? "size-12" : "size-10"}`} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5 max-w-56" />
            <Skeleton className="h-3 w-3/5 max-w-80" />
            {roomy ? <Skeleton className="mt-3 h-3 w-4/5 max-w-96" /> : null}
          </div>
          <Skeleton className="hidden h-8 w-20 shrink-0 rounded-lg sm:block" />
        </div>
      ))}
    </div>
  );
}

export default function PageLoadingSkeleton({ variant }: PageLoadingSkeletonProps) {
  if (variant === "live-stage") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="min-h-screen bg-[#101713] p-4 text-white sm:p-6">
        <p id="wf-page-loading-status" className="sr-only">Loading Live Stage…</p>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 !bg-[#29362d]" />
            <Skeleton className="h-3 w-56 !bg-[#29362d]" />
          </div>
          <Skeleton className="h-10 w-32 !bg-[#29362d]" />
        </div>
        <div className="mx-auto flex min-h-[68vh] max-w-5xl flex-col items-center justify-center gap-8 py-12">
          <Skeleton className="h-3 w-28 !bg-[#29362d]" />
          <Skeleton className="h-10 w-3/4 max-w-2xl !bg-[#29362d]" />
          <div className="w-full max-w-2xl space-y-5">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className={`h-6 !bg-[#29362d] ${index % 3 === 1 ? "w-4/5" : "w-full"}`} />
            ))}
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-[#17221b] p-4">
          <Skeleton className="h-8 w-28 !bg-[#29362d]" />
          <Skeleton className="h-8 w-36 !bg-[#29362d]" />
          <Skeleton className="h-8 w-28 !bg-[#29362d]" />
        </div>
      </main>
    );
  }

  if (variant === "song-detail") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading song and chord chart…</p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-72 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-white p-4">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-9 w-20 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-8">
            <div className="mb-8 flex flex-wrap justify-between gap-3"><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-36" /></div>
            <div className="max-h-[60vh] space-y-5 overflow-hidden">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className={`h-4 ${index % 3 === 1 ? "w-2/3" : "w-4/5"}`} />
                  {index % 2 === 0 ? <Skeleton className="h-3 w-3/5" /> : null}
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-4"><div className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-32" /><SkeletonRows count={3} /></div></aside>
        </div>
      </main>
    );
  }

  if (variant === "service-detail" || variant === "service-editor") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading service plan…</p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <PageHeading width="w-72" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
          {Array.from({ length: variant === "service-editor" ? 3 : 5 }, (_, index) => <Skeleton key={index} className="h-9 w-24 rounded-xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-11 w-full" /><Skeleton className="h-24 w-full" /></section>
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-36" /><SkeletonRows count={4} /></section>
          </div>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-32" /><SkeletonRows count={3} /></section>
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-36" /><SkeletonRows count={2} /></section>
          </aside>
        </div>
      </main>
    );
  }

  const width = variant === "files" ? "w-48" : variant === "settings" ? "w-44" : variant === "profile" ? "w-52" : variant === "notifications" ? "w-64" : variant === "activity" ? "w-40" : "w-60";

  if (variant === "profile") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading your profile…</p>
        <Skeleton className="h-36 w-full rounded-3xl sm:h-48" />
        <section className="-mt-14 relative rounded-3xl border border-[var(--border)] bg-white p-5 pt-7 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end"><Skeleton className="size-24 shrink-0 rounded-full border-4 border-white" /><div className="flex-1 space-y-3"><Skeleton className="h-7 w-64 max-w-full" /><Skeleton className="h-4 w-44" /></div><Skeleton className="h-10 w-28" /></div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-2xl bg-[var(--surface)] p-4 space-y-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-32" /></div>)}</div>
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-44" /><SkeletonRows count={4} roomy /></section>
      </main>
    );
  }

  if (variant === "settings") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-6xl space-y-7 px-4 py-7 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading workspace settings…</p>
        <PageHeading width={width} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <section key={index} className="rounded-3xl border border-[var(--border)] bg-white p-6 space-y-5"><Skeleton className="size-12 rounded-2xl" /><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /><Skeleton className="mt-2 h-8 w-24" /></section>)}</div>
      </main>
    );
  }

  if (variant === "files") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading shared files…</p>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><PageHeading width={width} /><Skeleton className="h-10 w-36" /></div>
        <section className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-6 sm:p-8"><div className="flex flex-col items-center gap-3 py-3"><Skeleton className="size-12 rounded-2xl" /><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-72 max-w-full" /><Skeleton className="h-10 w-32" /></div></section>
        <div className="flex flex-col gap-3 sm:flex-row"><Skeleton className="h-11 flex-1 rounded-xl" /><Skeleton className="h-11 w-full rounded-xl sm:w-48" /></div>
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><div className="flex items-center justify-between border-b border-[var(--border)] p-4"><Skeleton className="h-4 w-36" /><Skeleton className="h-8 w-24" /></div><SkeletonRows count={6} roomy /></section>
      </main>
    );
  }

  if (variant === "notifications") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading notifications…</p>
        <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end"><PageHeading width={width} /><Skeleton className="h-10 w-36" /></div>
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><SkeletonRows count={7} roomy /></section>
      </main>
    );
  }

  if (variant === "activity") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-4xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading workspace activity…</p>
        <div className="border-b border-[var(--border)] pb-6"><PageHeading width={width} /></div>
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><SkeletonRows count={8} roomy /></section>
      </main>
    );
  }

  if (variant === "service-history" || variant === "service-insights") {
    return (
      <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
        <p id="wf-page-loading-status" className="sr-only">Loading service {variant === "service-history" ? "history" : "insights"}…</p>
        <PageHeading width="w-64" />
        {variant === "service-insights" ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <section key={index} className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-20" /><Skeleton className="h-3 w-32" /></section>)}</div> : null}
        <section className="grid gap-5 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-44" /><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-3 w-3/4" /></div>)}</section>
      </main>
    );
  }

  return (
    <main aria-busy="true" aria-describedby="wf-page-loading-status" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 sm:py-8">
      <p id="wf-page-loading-status" className="sr-only">Loading your schedule…</p>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><PageHeading width="w-60" /><Skeleton className="h-10 w-32" /></div>
      <div className="flex flex-wrap gap-2">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-9 w-24 rounded-xl" />)}</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-5"><div className="flex items-center justify-between gap-4"><Skeleton className="h-5 w-48" /><Skeleton className="h-5 w-24" /></div><Skeleton className="h-3 w-64 max-w-full" /><SkeletonRows count={2} /></div>)}</section>
        <aside className="rounded-2xl border border-[var(--border)] bg-white p-5 space-y-4"><Skeleton className="h-5 w-32" /><SkeletonRows count={3} /></aside>
      </div>
    </main>
  );
}
