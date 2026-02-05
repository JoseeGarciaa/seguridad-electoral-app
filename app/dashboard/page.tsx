import { DashboardStats } from "@/components/dashboard/stats"
import { RecentAlerts } from "@/components/dashboard/recent-alerts"
import { VoteReportsCard } from "@/components/dashboard/vote-reports"
import { getDashboardStats, getRecentAlerts, getRecentVoteReports, getWitnessDashboardStats } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const delegateId = user?.delegateId ?? null
  const isWitness = user?.role === "witness" || user?.role === "delegate"

  const [stats, alerts, voteReports] = await Promise.all([
    isWitness ? getWitnessDashboardStats(delegateId) : getDashboardStats(),
    getRecentAlerts(isWitness && delegateId ? { delegateId } : undefined),
    getRecentVoteReports(isWitness ? { delegateId } : undefined),
  ])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <DashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <VoteReportsCard reports={voteReports} />
        <RecentAlerts alerts={alerts.items} />
      </div>
    </div>
  )
}
