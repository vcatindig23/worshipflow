import Image from "next/image"
import Link from "next/link"
import { Mail, UserRound } from "lucide-react"
import PasswordInput from "@/components/auth/password-input"
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

const inputClassName =
  "h-12 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 pr-12 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--brand)]/40 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"

export default async function SignupPage({
  searchParams,
}: SignupPageProps) {
  const params = await searchParams
  const errorMessage = params.error
    ? errorMessages[params.error] ?? "Something went wrong."
    : null

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-36 -top-40 size-[28rem] rounded-full bg-[var(--brand-soft)] opacity-70 blur-3xl" />
        <div className="absolute -bottom-44 -right-32 size-[30rem] rounded-full bg-[#dce9e4] opacity-70 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/60 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-md items-center justify-center sm:min-h-[calc(100svh-6rem)]">
        <div className="w-full">
          <header className="mb-7 text-center">
            <Link
              href="/"
              aria-label="WorshipFlow home"
              className="inline-flex rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-4"
            >
              <Image
                src="/worshipflow-wordmark.png"
                alt="WorshipFlow"
                width={545}
                height={100}
                priority
                className="mx-auto h-auto w-56 sm:w-64"
              />
            </Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Get started
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Create your account
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Bring your songs, service plans, and worship team together in one workspace.
            </p>
          </header>

          <section className="rounded-[28px] border border-[var(--border)] bg-white/95 p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] ring-1 ring-black/[0.02] backdrop-blur sm:p-8">
            {errorMessage ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <form action={signup} className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Full name
                </label>
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Your full name"
                    className={inputClassName.replace("pr-12", "pl-10 pr-4")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                    placeholder="you@example.com"
                    className={inputClassName.replace("pr-12", "pl-10 pr-4")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="At least 8 characters"
                  className={inputClassName}
                />
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Use at least 8 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="Enter your password again"
                  className={inputClassName}
                />
              </div>

              <button
                type="submit"
                className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
              >
                Create account
              </button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">
              <p className="text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="rounded-sm font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </section>

          <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-5 text-[var(--muted)]">
            Your account helps you prepare and coordinate with your church worship team.
          </p>
        </div>
      </div>
    </main>
  )
}
