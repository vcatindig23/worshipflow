import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react"
import { joinOrganization } from "./actions"

type JoinPageProps = {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >
}

function getParam(
  value: string | string[] | undefined
) {
  return Array.isArray(value)
    ? value[0]
    : value
}

const errors: Record<
  string,
  string
> = {
  invalid_code:
    "Enter a valid invitation code.",
  INVALID_INVITATION:
    "That invitation code is invalid.",
  INVITATION_NOT_ACTIVE:
    "That invitation is no longer active.",
  INVITATION_EXPIRED:
    "That invitation has expired.",
  INVITATION_EMAIL_MISMATCH:
    "This invitation was created for a different email address.",
  ACCOUNT_ALREADY_BELONGS_TO_CHURCH:
    "This account already belongs to another church.",
  join_failed:
    "We could not join the church with that invitation.",
}

export default async function JoinPage({
  searchParams,
}: JoinPageProps) {
  const params = await searchParams
  const errorKey =
    getParam(params.error) ?? ""

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl border border-[var(--border)] bg-white p-7 shadow-sm sm:p-9">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="size-4" />
            Back to choices
          </Link>

          <div className="mt-8">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <Users className="size-6" />
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              Join an existing church
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Enter the invitation code given to you by a church
              administrator.
            </p>
          </div>

          {errors[errorKey] ? (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {errors[errorKey]}
            </div>
          ) : null}

          <form
            action={joinOrganization}
            className="mt-7 space-y-5"
          >
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                Invitation code
              </label>

              <input
                id="code"
                name="code"
                required
                minLength={8}
                maxLength={64}
                autoComplete="off"
                spellCheck={false}
                placeholder="XXXXXXXXXXXX"
                className="h-14 w-full rounded-2xl border border-[var(--border)] bg-white px-4 text-center text-lg font-bold uppercase tracking-[0.25em] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Join Church
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-7 space-y-3 rounded-2xl bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />

              <p className="text-sm leading-6 text-[var(--muted)]">
                Your invitation determines your initial role in the
                church workspace.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />

              <p className="text-sm leading-6 text-[var(--muted)]">
                The invitation can only be accepted by the email
                address it was created for.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}