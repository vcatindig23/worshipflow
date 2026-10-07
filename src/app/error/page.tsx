import Link from "next/link"
import { AlertCircle, Music2 } from "lucide-react"

type ErrorPageProps = {
  searchParams: Promise<{
    code?: string
  }>
}

const messages: Record<string, string> = {
  confirmation_failed:
    "The confirmation link is invalid, expired, or has already been used.",
  google_sign_in_failed:
    "Google sign-in was cancelled or could not be completed. Please try again.",
  membership_load_failed:
    "Your church membership could not be loaded. Please try signing in again.",
}

export default async function ErrorPage({
  searchParams,
}: ErrorPageProps) {
  const params = await searchParams
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
                <Music2 className="size-5" />
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
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                Go to sign in
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