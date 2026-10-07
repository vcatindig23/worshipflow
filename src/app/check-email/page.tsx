import Link from "next/link"
import { MailCheck } from "lucide-react"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"

export default function CheckEmailPage() {
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
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <MailCheck className="size-6" />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              If email confirmation is enabled, open the confirmation link
              sent to your email address. After verification, you&apos;ll continue
              to your WorshipFlow setup.
            </p>

            <Link
              href="/login"
              className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}