"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import {
  ArrowRight,
  Church,
  KeyRound,
  Loader2,
  Mail,
  Music2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  login,
  type LoginState,
} from "./actions"

const initialState: LoginState = {
  error: "",
}

export default function LoginPage() {
  const [state, formAction, pending] =
    useActionState(
      login,
      initialState
    )
  const [googlePending, setGooglePending] = useState(false)
  const [googleError, setGoogleError] = useState("")

  async function handleGoogleSignIn() {
    setGoogleError("")
    setGooglePending(true)

    try {
      const { data, error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2F`,
        },
      })

      if (error || !data.url) {
        setGoogleError(
          "Unable to start Google sign-in. Please try again."
        )
        return
      }

      window.location.assign(data.url)
    } catch (error) {
      console.error("Unable to start Google sign-in.", error)
      setGoogleError(
        "Unable to start Google sign-in. Please try again."
      )
    } finally {
      setGooglePending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-sm">
              <Music2 className="size-6" />
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Welcome to WorshipFlow
            </h1>

            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Sign in to manage your church&apos;s worship
              workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-7">
            {state.error ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {state.error}
              </div>
            ) : null}

            {googleError ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {googleError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={pending || googlePending}
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googlePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 48 48"
                  className="size-5"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.62 5.91c4.45-4.11 7.15-10.16 7.15-17.56Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59A14.42 14.42 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.91 23.91 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.42-4.84 2.27-8.28 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                  />
                </svg>
              )}
              {googlePending ? "Redirecting to Google..." : "Continue with Google"}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">
                Or sign in with email
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <form
              action={formAction}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={320}
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[var(--foreground)]"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[var(--brand)] transition hover:text-[var(--brand-dark)]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    maxLength={200}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending || googlePending}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}

                {pending
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">
                New to WorshipFlow?
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Link
              href="/signup"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]"
            >
              <Church className="size-4" />
              Create an Account
            </Link>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
            After signing in, WorshipFlow will automatically send
            you to your church workspace or onboarding.
          </p>
        </div>
      </div>
    </main>
  )
}