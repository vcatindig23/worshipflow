import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

let serviceTimeColumnAvailable: boolean | undefined
let serviceTimeColumnCheck: Promise<boolean> | undefined
let serviceTimeColumnCheckedAt = 0

export async function hasServiceTimeColumn(
  supabase: SupabaseServerClient
) {
  if (
    serviceTimeColumnAvailable === true ||
    (serviceTimeColumnAvailable === false &&
      Date.now() - serviceTimeColumnCheckedAt < 30_000)
  ) {
    return serviceTimeColumnAvailable
  }

  serviceTimeColumnCheck = undefined
  serviceTimeColumnCheck ??= Promise.resolve(
    supabase
      .from("setlists")
      .select("service_time")
      .limit(0)
      .then(({ error }) => {
        if (
          error?.code === "42703" ||
          error?.code === "PGRST204"
        ) {
          serviceTimeColumnAvailable = false
          serviceTimeColumnCheckedAt = Date.now()
          return false
        }

        if (error) {
          throw new Error("Unable to verify service-time database schema.", {
            cause: error,
          })
        }

        serviceTimeColumnAvailable = true
        serviceTimeColumnCheckedAt = Date.now()
        return true
      })
  )
    .catch((error: unknown) => {
      serviceTimeColumnCheck = undefined
      throw error
    })

  if (!serviceTimeColumnCheck) {
    throw new Error("Unable to verify service-time database schema.")
  }

  return serviceTimeColumnCheck
}
