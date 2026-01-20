import { Suspense } from "react"
import { WarRoomHeader } from "@/components/warroom/warroom-header"
import { LiveFeed } from "@/components/warroom/live-feed"
import { CandidateComparison } from "@/components/warroom/candidate-comparison"
import { MunicipalTrafficLight } from "@/components/warroom/municipal-traffic-light"
import { AlertsPanel } from "@/components/warroom/alerts-panel"
import { EvidenceGallery } from "@/components/warroom/evidence-gallery"

export default function WarRoomPage() {
  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* War Room Header with Live Status */}
      <WarRoomHeader />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* Live Feed - Takes 1 column */}
        <div className="lg:col-span-1 h-[500px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <LiveFeed />
          </Suspense>
        </div>

        {/* Candidate Comparison - Takes 2 columns */}
        <div className="lg:col-span-2 h-[500px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <CandidateComparison />
          </Suspense>
        </div>

        {/* Alerts Panel - Takes 1 column */}
        <div className="lg:col-span-1 h-[500px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <AlertsPanel />
          </Suspense>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Municipal Traffic Light */}
        <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
          <MunicipalTrafficLight />
        </Suspense>

        {/* Evidence Gallery */}
        <Suspense fallback={<div className="h-80 animate-pulse bg-secondary/50 rounded-xl" />}>
          <EvidenceGallery />
        </Suspense>
      </div>
    </div>
  )
}
