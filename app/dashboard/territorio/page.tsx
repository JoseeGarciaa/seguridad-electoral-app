import { Suspense } from "react"
import { TerritoryMap } from "@/components/territorio/territory-map"
import { TerritoryFilters } from "@/components/territorio/territory-filters"
import { TerritoryTable } from "@/components/territorio/territory-table"
import { TerritoryStats } from "@/components/territorio/territory-stats"

export default function TerritorioPage() {
  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Stats */}
      <Suspense fallback={<div className="h-20 animate-pulse bg-secondary/50 rounded-xl" />}>
        <TerritoryStats />
      </Suspense>

      {/* Filters */}
      <TerritoryFilters />

      {/* Map and Table */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Map - Takes 3 columns */}
        <div className="lg:col-span-3 h-[500px] lg:h-[600px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <TerritoryMap />
          </Suspense>
        </div>

        {/* Table - Takes 2 columns */}
        <div className="lg:col-span-2 h-[500px] lg:h-[600px]">
          <Suspense fallback={<div className="h-full animate-pulse bg-secondary/50 rounded-xl" />}>
            <TerritoryTable />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
