import { Suspense } from "react"
import { WarRoomHeader } from "@/components/warroom/warroom-header"
import { LiveFeed } from "@/components/warroom/live-feed"
import { CandidateComparison } from "@/components/warroom/candidate-comparison"
import { MunicipalTrafficLight } from "@/components/warroom/municipal-traffic-light"
import { AlertsPanel } from "@/components/warroom/alerts-panel"
import { EvidenceGallery } from "@/components/warroom/evidence-gallery"
import { WarRoomDataProvider } from "@/components/warroom/warroom-data-provider"

export default function DashboardPage() {
  return (
    <WarRoomDataProvider>
      <div className="space-y-4 pb-20 lg:pb-6">
        <WarRoomHeader title="CENTRO DE MANDO" subtitle="Dashboard Electoral en Vivo" />

        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 h-[500px]">
            <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
              <LiveFeed />
            </Suspense>
          </div>

          <div className="lg:col-span-2 h-[500px]">
            <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
              <CandidateComparison />
            </Suspense>
          </div>

          <div className="lg:col-span-1 h-[500px]">
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
      </div>
    </WarRoomDataProvider>
  )
}
