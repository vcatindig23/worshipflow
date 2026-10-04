"use client"

import { useActionState } from "react"
import {
  Check,
  Clipboard,
  Loader2,
  Send,
} from "lucide-react"
import {
  createInvitation,
  type InvitationState,
} from "./actions"

const initialState: InvitationState = {
  success: false,
  code: "",
  error: "",
}

export default function InviteMemberForm() {
  const [state, formAction, pending] =
    useActionState(
      createInvitation,
      initialState
    )

  async function copyCode() {
    if (!state.code) {
      return
    }

    await navigator.clipboard.writeText(
      state.code
    )
  }

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_auto]">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={320}
            placeholder="member@example.com"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-medium text-[var(--foreground)]"
          >
            Role
          </label>

          <select
            id="role"
            name="role"
            defaultValue="team_member"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm outline-none transition focus:border-[var(--brand)]"
          >
            <option value="worship_leader">
              Worship Leader
            </option>
            <option value="song_editor">
              Song Editor
            </option>
            <option value="team_member">
              Team Member
            </option>
            <option value="viewer">
              Viewer
            </option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}

            {pending
              ? "Creating..."
              : "Create Invitation"}
          </button>
        </div>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      ) : null}

      {state.success && state.code ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="size-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-emerald-950">
                Invitation created
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                Give this code to the invited member. It expires in
                7 days.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <code className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-base font-bold tracking-[0.2em] text-[var(--foreground)] sm:min-w-[210px]">
                {state.code}
              </code>

              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                <Clipboard className="size-4" />
                <span className="hidden sm:inline">
                  Copy
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}