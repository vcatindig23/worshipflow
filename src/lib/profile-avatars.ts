import { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const avatarPathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i

export async function getProfileAvatarUrlMap(
  supabase: SupabaseServerClient,
  paths: (string | null)[]
) {
  const safePaths = Array.from(
    new Set(
      paths.filter(
        (path): path is string =>
          typeof path === "string" && avatarPathPattern.test(path)
      )
    )
  )

  if (safePaths.length === 0) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase.storage
    .from("profile-avatars")
    .createSignedUrls(safePaths, 60 * 30)

  if (error) {
    console.error("Failed to create profile avatar URLs:", {
      message: error.message,
    })
    throw new Error("Unable to load team profile photos.")
  }

  return new Map(
    data.flatMap((item) =>
      item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []
    )
  )
}
