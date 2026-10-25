import { spawn } from "node:child_process"

// Start and inspect the built app in one process tree. Bind only to loopback.
const port = "3100"
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        "https://ci-placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "ci-placeholder-public-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
)
let started = false
let audit
const timeout = setTimeout(() => {
  console.error("SEO audit timed out")
  audit?.kill()
  server.kill()
  process.exitCode = 1
}, 60000)
server.stderr.on("data", (data) => process.stderr.write(data))
server.stdout.on("data", (data) => {
  process.stdout.write(data)
  if (started || !data.toString().includes("Ready")) return
  started = true
  audit = spawn(
    process.execPath,
    ["scripts/audit-public-seo.mjs", `http://localhost:${port}`],
    { stdio: "inherit" }
  )
  audit.on("exit", (code) => {
    clearTimeout(timeout)
    server.kill()
    process.exitCode = code ?? 1
  })
})
server.on("exit", (code) => {
  if (!started) {
    clearTimeout(timeout)
    process.exitCode = code || 1
  }
})
process.on("SIGINT", () => {
  audit?.kill()
  server.kill()
})
process.on("SIGTERM", () => {
  audit?.kill()
  server.kill()
})
