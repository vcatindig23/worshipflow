import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasPermission, isRole, type Permission } from "@/lib/permissions"

/** Always derive identity and tenant from verified claims and the current database membership. */
export async function requireWorkspaceAuthorization(
  permission: Permission = "workspace:read"
) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect("/login")
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle()
  if (membershipError) redirect("/error?code=membership_load_failed")
  if (!membership) redirect("/onboarding")
  if (!isRole(membership.role) || !hasPermission(membership.role, permission)) {
    redirect("/error?code=permission_denied")
  }
  return {
    supabase,
    userId,
    organizationId: membership.organization_id as string,
    role: membership.role,
  }
}
