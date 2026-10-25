import { Pagination } from "@/components/ui/pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/form-controls"
import { PageContainer, PageHeader } from "@/components/ui/page"
import Link from "next/link"
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatServiceTime } from "@/lib/service-scheduling"
import { hasServiceTimeColumn } from "@/lib/service-time-schema"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { toSearchPattern } from "@/lib/global-search"

type SetlistsPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

type Setlist = {
  id: string
  name: string
  description: string | null
  service_date: string | null
  service_time: string | null
  status: "draft" | "published" | "archived"
  created_at: string
  updated_at: string
}

type SetlistSongRow = {
  id: string
  setlist_id: string
}

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

function formatDate(value: string | null) {
  if (!value) {
    return "No service date"
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`))
}

function statusLabel(
  status: Setlist["status"]
) {
  if (status === "published") {
    return "Published"
  }

  if (status === "archived") {
    return "Archived"
  }

  return "Draft"
}

export default async function SetlistsPage({
  searchParams,
}: SetlistsPageProps) {
  const params = await searchParams
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const serviceTimeAvailable = await hasServiceTimeColumn(supabase)

  const query = getParam(params.q)?.trim().slice(0, 100) ?? ""
  const requestedPage = Number.parseInt(getParam(params.page) ?? "1", 10)
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1
  const pageSize = 25

  const requestedStatus =
    getParam(params.status) ?? "all"

  const status =
    requestedStatus === "draft" ||
    requestedStatus === "published" ||
    requestedStatus === "archived"
      ? requestedStatus
      : "all"

  let setlistQuery = supabase
    .from("setlists")
    .select("*", { count: "exact" })
    .eq(
      "organization_id",
      workspace.organizationId
    )
    .order("service_date", {
      ascending: false,
      nullsFirst: false,
    })
    .order("updated_at", {
      ascending: false,
    })

  if (status !== "all") {
    setlistQuery = setlistQuery.eq(
      "status",
      status
    )
  }

  if (query) {
    const safeQuery = query.replace(/[^\p{L}\p{N} -]/gu, " ").trim()
    if (safeQuery) {
      const pattern = toSearchPattern(safeQuery)
      setlistQuery = setlistQuery.or("name.ilike." + pattern + ",description.ilike." + pattern)
    }
  }

  const {
    data: setlistRows,
    error: setlistError,
    count: totalSetlistsCount,
  } = await setlistQuery.range((page - 1) * pageSize, page * pageSize - 1)

  if (setlistError) {
    redirect(
      "/error?code=setlists_load_failed"
    )
  }

  const setlists = (setlistRows ?? []).map((setlist) => ({
    ...setlist,
    service_time: serviceTimeAvailable
      ? setlist.service_time
      : null,
  })) as Setlist[]

  let songRows: SetlistSongRow[] = []

  if (setlists.length > 0) {
    const { data, error } = await supabase
      .from("setlist_songs")
      .select("id, setlist_id")
      .in(
        "setlist_id",
        setlists.map((setlist) => setlist.id)
      )

    if (error) {
      redirect("/error?code=setlists_load_failed")
    }

    songRows = (data ?? []) as SetlistSongRow[]
  }

  const songCountBySetlist = new Map<
    string,
    number
  >()

  for (const row of songRows) {
    songCountBySetlist.set(
      row.setlist_id,
      (songCountBySetlist.get(
        row.setlist_id
      ) ?? 0) + 1
    )
  }

  const filteredSetlists = setlists
  const totalSetlists = totalSetlistsCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalSetlists / pageSize))
  const pageHref = (targetPage: number) => {
    const nextParams = new URLSearchParams()
    if (query) nextParams.set("q", query)
    if (status !== "all") nextParams.set("status", status)
    nextParams.set("page", String(targetPage))
    return "/setlists?" + nextParams.toString()
  }

  return (
    <PageContainer>
      <PageHeader
        title={<>Setlists</>}
        eyebrow={<>Service Planning</>}
        description={<>Build and organize worship sets for upcoming
            services and events.</>}
        actions={<>
<Link
          href="/setlists/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="size-4" />
          New Setlist
        </Link>
        </>}
      />

      <section className="wf-card p-5 sm:p-6">
        <form
          action="/setlists"
          method="get"
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

            <Input
              name="q"
              defaultValue={query}
              placeholder="Search setlists..."
              className="w-full pl-10 pr-4"
            aria-label="Search" />
          </div>

          <Select
            name="status"
            defaultValue={status}
            className="px-3.5 font-medium text-[var(--foreground)] sm:w-auto"
           aria-label="Status">
            <option value="all">
              All statuses
            </option>
            <option value="draft">
              Draft
            </option>
            <option value="published">
              Published
            </option>
            <option value="archived">
              Archived
            </option>
          </Select>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--brand-soft)]"
          >
            Apply
          </button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {totalSetlists}{" "}
              {totalSetlists === 1 ? "setlist" : "setlists"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Your church&apos;s worship plans
            </p>
          </div>
        </div>

        {filteredSetlists.length === 0 ? (
          <EmptyState title={query || status !== "all" ? "No setlists match your filters" : "No setlists yet"} description={query || status !== "all" ? "Try another search or clear the status filter to see all service plans." : "Create a setlist to start planning your next worship service."} icon={<BookOpen className="size-5" />} actions={<> {query || status !== "all" ? <Link href="/setlists" className={buttonVariants({ variant: "outline" })}>Clear filters</Link> : null}<Link href="/setlists/new" className={buttonVariants()}><Plus className="size-4" aria-hidden="true" />Create setlist</Link> </>} />
        ) : (
          <div className="grid gap-3">
            {filteredSetlists.map(
              (setlist) => {
                const count =
                  songCountBySetlist.get(
                    setlist.id
                  ) ?? 0

                return (
                  <Link
                    key={setlist.id}
                    href={`/setlists/${setlist.id}`}
                    className="group rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                          {setlist.status ===
                          "archived" ? (
                            <Archive className="size-5" />
                          ) : (
                            <BookOpen className="size-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--brand)]">
                              {setlist.name}
                            </h2>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                setlist.status ===
                                "published"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : setlist.status ===
                                      "archived"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-[var(--surface)] text-[var(--muted)]"
                              }`}
                            >
                              {statusLabel(
                                setlist.status
                              )}
                            </span>
                          </div>

                          {setlist.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                              {setlist.description}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="size-3.5" />
                              {formatDate(
                                setlist.service_date
                              )}
                              {formatServiceTime(setlist.service_time)
                                ? ` · ${formatServiceTime(setlist.service_time)}`
                                : ""}
                            </span>

                            <span>
                              {count}{" "}
                              {count === 1
                                ? "song"
                                : "songs"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="hidden size-5 shrink-0 text-[var(--muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)] md:block" />
                    </div>
                  </Link>
                )
              }
            )}
          </div>
        )}

        {totalPages > 1 ? (
          <Pagination label="Setlist pages" summary={<>Page {page} of {totalPages} · {totalSetlists} setlists</>} previousHref={page > 1 ? pageHref(page - 1) : undefined} nextHref={page < totalPages ? pageHref(page + 1) : undefined} />
        ) : null}
      </section>
    </PageContainer>
  )
}
