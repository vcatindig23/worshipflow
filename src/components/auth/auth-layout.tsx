import Image from "next/image"
import Link from "next/link"

type AuthLayoutProps = {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main
      id="main-content"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 size-[28rem] rounded-full bg-[var(--brand-soft)] opacity-65 blur-3xl" />
        <div className="absolute -bottom-48 -right-36 size-[30rem] rounded-full bg-[#dce9e4] opacity-65 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[480px] flex-col sm:min-h-[calc(100svh-5rem)]">
        <div className="my-auto w-full py-2">
          <header className="mb-7 flex flex-col items-center text-center">
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
                className="h-auto w-52 sm:w-56"
              />
            </Link>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Your worship team, in sync
            </p>
          </header>

          {children}

          <footer className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[var(--muted)]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--brand)]/65" />
            A shared home for your worship team
          </footer>
        </div>
      </div>
    </main>
  )
}
