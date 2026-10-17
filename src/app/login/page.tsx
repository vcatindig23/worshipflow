"use client"

import Image from "next/image"
import Link from "next/link"
import { useActionState } from "react"
import {
  ArrowRight,
  Church,
  KeyRound,
  Loader2,
  Mail,
} from "lucide-react"
import PasswordInput from "@/components/auth/password-input"
import { login, type LoginState } from "./actions"

const initialState: LoginState = {
  error: "",
}

const inputClassName =
  "h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-12 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--brand)]/40 focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]"

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <main id="main-content" className="relative isolate min-h-screen overflow-hidden bg-[var(--background)] px-4 py-8 sm:px-6 sm:py-12">
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
          <header className="mb-8 text-center">
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

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Your worship team, in sync
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Welcome back
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Sign in to prepare songs, coordinate services, and connect with your church team.
            </p>
          </header>

          <section className="rounded-[28px] border border-[var(--border)] bg-white/95 p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] ring-1 ring-black/[0.02] backdrop-blur sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                Sign in to your account
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Enter your account details to continue.
              </p>
            </div>

            {state.error ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {state.error}
              </div>
            ) : null}

            <form action={formAction} className="space-y-5">
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
                    required
                    autoComplete="email"
                    maxLength={320}
                    placeholder="you@example.com"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[var(--foreground)]"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="rounded-sm text-xs font-semibold text-[var(--brand)] transition hover:text-[var(--brand-dark)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <KeyRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    maxLength={200}
                    placeholder="Enter your password"
                    className={inputClassName}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                )}
                {pending ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">New to WorshipFlow?</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Link
              href="/signup"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand)]/40 hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
            >
              <Church aria-hidden="true" className="size-4" />
              Create an account
            </Link>
          </section>

          <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-5 text-[var(--muted)]">
            After signing in, WorshipFlow will take you to your church workspace or onboarding.
          </p>
        </div>
      </div>
    </main>
  )
}
