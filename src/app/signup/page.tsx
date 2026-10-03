import Link from "next/link"
import { Music2 } from "lucide-react"
import { signup } from "./actions"

type SignupPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

const errorMessages: Record<string, string> = {
  invalid_details:
    "Please check your name, email, and password. Passwords must match and contain at least 8 characters.",
  sign_up_failed:
    "We could not create your account. The email may already be registered.",
  configuration_error:
    "The application is missing its site URL configuration.",
}

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const params = await searchParams

  const errorMessage = params.error
    ? errorMessages[params.error] ?? "Something went wrong."
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
                Get started
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                Create your account
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Create your WorshipFlow account to set up your church
                workspace.
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

            <form action={signup} className="space-y-5">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-medium"
                >
                  Full name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Your full name"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

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
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="At least 8 characters"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="Enter your password again"
                  className="h-11 w-full rounded-xl border border-[var(--border)] px-3.5 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"
                />
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)]"
              >
                Create account
              </button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-6 text-center">
              <p className="text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--brand)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}