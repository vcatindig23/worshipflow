import type { Metadata } from "next"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"

export const metadata: Metadata = {
  title: "Something went wrong",
  description:
    "Resolve a WorshipFlow sign-in or workspace error and return to your account.",
  alternates: { canonical: "/error" },
}

type ErrorPageProps = {
  searchParams: Promise<{
    code?: string
  }>
}

const recovery: Record<string, { href: string; label: string }> = {
  songs_load_failed: { href: "/songs", label: "Try loading songs again" },
  setlists_load_failed: { href: "/setlists", label: "Try loading setlists again" },
  global_search_failed: { href: "/search", label: "Try searching again" },
  files_load_failed: { href: "/files", label: "Try loading files again" },
}

const messages: Record<string, string> = {
  permission_denied: "Your current workspace role does not allow this action. Ask a church administrator if you need additional access.",
  songs_load_failed: "We couldn’t load your song library. Check your connection, then try loading it again.",
  setlists_load_failed: "We couldn’t load your service plans. Check your connection, then try loading them again.",
  files_load_failed: "Shared files are temporarily unavailable. Check your connection and try again.",
  confirmation_failed:
    "The confirmation link is invalid, expired, or has already been used.",
  membership_load_failed:
    "Your church membership could not be loaded. Please try signing in again.",
  global_search_failed:
    "Your workspace search could not be completed. Please try again.",
}

export default async function ErrorPage({
  searchParams,
}: ErrorPageProps) {
  const params = await searchParams
  const retry = recovery[params.code ?? ""]
  const message =
    (params.code && messages[params.code]) ||
    "Something went wrong while processing your request."

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
                <WorshipFlowLogo className="size-7" />
              </div>
              <span className="text-lg font-semibold tracking-[-0.025em]">
                WorshipFlow
              </span>
            </Link>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="size-6" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {message}
            </p>

            <div className="mt-7 flex flex-col gap-2">
              <Link
                href={retry?.href ?? "/login"}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                {retry?.label ?? "Go to sign in"}
              </Link>

              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
              >
                Return home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
