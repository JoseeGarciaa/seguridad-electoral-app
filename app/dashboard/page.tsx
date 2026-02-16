import { Suspense } from "react"
import { WarRoomHeader } from "@/components/warroom/warroom-header"
import { LiveFeed } from "@/components/warroom/live-feed"
import { CandidateComparison } from "@/components/warroom/candidate-comparison"
import { MunicipalTrafficLight } from "@/components/warroom/municipal-traffic-light"
import { AlertsPanel } from "@/components/warroom/alerts-panel"
import { EvidenceGallery } from "@/components/warroom/evidence-gallery"
import { WarRoomDataProvider } from "@/components/warroom/warroom-data-provider"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const hideActiveWitnesses = user?.role === "delegate" || user?.role === "witness"

  return (
    <WarRoomDataProvider>
      <div className="space-y-4 pb-20 lg:pb-6">
        <WarRoomHeader
          title="CENTRO DE MANDO"
          subtitle="Dashboard Electoral en Vivo"
          showActiveWitnesses={!hideActiveWitnesses}
        />

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
              <LiveFeed />
            </Suspense>
          </div>

          <div className="h-[500px]">
            <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
              <AlertsPanel />
            </Suspense>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
            <MunicipalTrafficLight />
          </Suspense>

          <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
            <EvidenceGallery />
          </Suspense>
        </div>

        <div className="h-[650px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <CandidateComparison />
          </Suspense>
        </div>
      </div>
    </WarRoomDataProvider>
  )
}
