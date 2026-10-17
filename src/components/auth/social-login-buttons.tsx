"use client"

import { useActionState } from "react"
import { LoaderCircle } from "lucide-react"
import {
  startOAuthSignIn,
  type OAuthSignInState,
} from "@/app/login/actions"

const initialState: OAuthSignInState = { error: "" }

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.72 7.18l7.62 5.91c4.45-4.11 7.14-10.16 7.14-17.56Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.89l-7.62-5.91c-2.12 1.43-4.84 2.29-8.28 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  )
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.35c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12Z" />
    </svg>
  )
}

export default function SocialLoginButtons() {
  const [state, formAction, pending] = useActionState(
    startOAuthSignIn,
    initialState
  )

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <button
          type="submit"
          name="provider"
          value="google"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/40 hover:bg-[var(--surface)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <GoogleMark />
          )}
          Continue with Google
        </button>
        <button
          type="submit"
          name="provider"
          value="facebook"
          disabled={pending}
          className="inline-flex h-12 items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand)]/40 hover:bg-[var(--surface)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <FacebookMark />
          )}
          Continue with Facebook
        </button>
      </form>

      {pending ? (
        <p role="status" className="text-center text-xs text-[var(--muted)]">
          Connecting securely…
        </p>
      ) : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {state.error}
        </div>
      ) : null}
    </div>
  )
}
