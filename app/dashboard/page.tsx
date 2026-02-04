import { DashboardStats } from "@/components/dashboard/stats"
import { RecentAlerts } from "@/components/dashboard/recent-alerts"
import { getRecentAlerts, getWitnessDashboardStats } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const delegateId = user?.delegateId ?? null

  const [stats, alerts] = await Promise.all([
    getWitnessDashboardStats(delegateId),
    getRecentAlerts(delegateId ? { delegateId } : undefined),
  ])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <DashboardStats stats={stats} />

      <RecentAlerts alerts={alerts.items} />
    </div>
  )
}
