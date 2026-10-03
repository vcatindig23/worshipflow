import Link from "next/link"
import { Music2 } from "lucide-react"
import { login } from "./actions"

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  invalid_credentials: "Enter a valid email address and password.",
  sign_in_failed: "We could not sign you in. Check your email and password.",
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams
  const errorMessage = params.error
    ? errorMessages[params.error] ?? "Something went wrong. Please try again."
    : null

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

          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-medium text-[var(--brand)]">
                Welcome back
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                Sign in to WorshipFlow
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Manage songs, chords, setlists, services, and your worship
                team.
              </p>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <form action={login} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]"
              >
                Sign in
              </button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  Create one
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-[var(--muted)]">
            WorshipFlow is designed for church worship teams and ministry
            collaboration.
          </p>
        </div>
      </div>
    </main>
  )
}