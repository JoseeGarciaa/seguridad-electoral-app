import { DashboardStats } from "@/components/dashboard/stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentAlerts } from "@/components/dashboard/recent-alerts"
import { CoverageOverview } from "@/components/dashboard/coverage-overview"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import {
  getActivityFeed,
  getCoverageOverview,
  getDashboardStats,
  getRecentAlerts,
} from "@/lib/dashboard-data"

export default async function DashboardPage() {
  const [stats, coverage, alerts, activities] = await Promise.all([
    getDashboardStats(),
    getCoverageOverview(),
    getRecentAlerts(),
    getActivityFeed(),
  ])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <DashboardStats stats={stats} />

      <QuickActions pendingAlerts={alerts.activeCount} />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coverage Overview - Takes 2 columns */}
        <div className="lg:col-span-2">
          <CoverageOverview items={coverage.items} summary={coverage.summary} />
        </div>

        {/* Alerts */}
        <div>
          <RecentAlerts alerts={alerts.items} />
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={activities} />
    </div>
  )
}
