"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Layers, Map } from "lucide-react"

type ViewMode = "circle" | "heatmap" | "3d"

type Props = {
  search: string
  onSearchChange: (v: string) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
}

export function TerritoryFilters({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar puesto, municipio, dirección..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "heatmap" ? "secondary" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => onViewModeChange("heatmap")}
          >
            <Layers className="w-4 h-4" />
            Heatmap
          </Button>
          <Button
            variant={viewMode === "3d" ? "secondary" : "outline"}
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => onViewModeChange("3d")}
          >
            <Map className="w-4 h-4" />
            3D
          </Button>
        </div>
      </div>
    </div>
  )
}
