import { getWorkspace } from "@/lib/workspace/get-workspace"
import DashboardView from "@/components/dashboard-view"

export default async function HomePage() {
  const workspace = await getWorkspace()

  return <DashboardView workspace={workspace} />
}