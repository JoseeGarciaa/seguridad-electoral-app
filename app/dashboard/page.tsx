import { Suspense } from "react"
import { DashboardStats } from "@/components/dashboard/stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentAlerts } from "@/components/dashboard/recent-alerts"
import { CoverageOverview } from "@/components/dashboard/coverage-overview"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Stats Grid */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-secondary/50 rounded-xl" />}>
        <DashboardStats />
      </Suspense>

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coverage Overview - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
            <CoverageOverview />
          </Suspense>
        </div>

        {/* Alerts */}
        <div>
          <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
            <RecentAlerts />
          </Suspense>
        </div>
      </div>

      {/* Activity Feed */}
      <Suspense fallback={<div className="h-40 animate-pulse bg-secondary/50 rounded-xl" />}>
        <ActivityFeed />
      </Suspense>
    </div>
  )
}
