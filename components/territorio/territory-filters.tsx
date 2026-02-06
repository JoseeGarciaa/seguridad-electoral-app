"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Layers, Map } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ViewMode = "circle" | "heatmap" | "3d"

type Props = {
  search: string
  onSearchChange: (v: string) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  departments: Array<{ code: string; name: string }>
  municipalities: Array<{ code: string; name: string; departmentCode?: string }>
  selectedDepartment: string | null // code
  selectedMunicipality: string | null // code
  onDepartmentChange: (v: string | null) => void
  onMunicipalityChange: (v: string | null) => void
}

export function TerritoryFilters({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  departments,
  municipalities,
  selectedDepartment,
  selectedMunicipality,
  onDepartmentChange,
  onMunicipalityChange,
}: Props) {
  const ALL_VALUE = "__all__"

  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      <div className="flex flex-col gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Department filter */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Departamento</p>
            <Select
              value={selectedDepartment ?? ALL_VALUE}
              onValueChange={(value) => onDepartmentChange(value === ALL_VALUE ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.code} value={dept.code}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Municipality filter */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Municipio / Ciudad</p>
            <Select
              value={selectedMunicipality ?? ALL_VALUE}
              onValueChange={(value) => onMunicipalityChange(value === ALL_VALUE ? null : value)}
              disabled={!departments.length && !municipalities.length}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedDepartment ? "Todos" : "Selecciona un departamento"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos</SelectItem>
                {municipalities.map((city) => (
                  <SelectItem key={city.code} value={city.code}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode */}
          <div className="flex items-end gap-2">
            <Button
              variant={viewMode === "heatmap" ? "secondary" : "outline"}
              size="sm"
              className="gap-2 flex-1"
              onClick={() => onViewModeChange("heatmap")}
            >
              <Layers className="w-4 h-4" />
              Heatmap
            </Button>
            <Button
              variant={viewMode === "3d" ? "secondary" : "outline"}
              size="sm"
              className="gap-2 bg-transparent flex-1"
              onClick={() => onViewModeChange("3d")}
            >
              <Map className="w-4 h-4" />
              3D
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
