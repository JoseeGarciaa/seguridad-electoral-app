"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Layers, Map } from "lucide-react"

type ViewMode = "circle" | "heatmap" | "3d"

type DepartmentOption = { code: string; name: string }
type MunicipalityOption = { code: string; name: string }

type Props = {
  search: string
  onSearchChange: (v: string) => void
  department: string
  onDepartmentChange: (v: string) => void
  municipality: string
  onMunicipalityChange: (v: string) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
}

export function TerritoryFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  municipality,
  onMunicipalityChange,
  viewMode,
  onViewModeChange,
}: Props) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([])

  useEffect(() => {
    let active = true
    const loadDepartments = async () => {
      try {
        const res = await fetch("/api/divipole/options")
        if (!res.ok) return
        const data = (await res.json()) as { departments?: DepartmentOption[] }
        if (active && Array.isArray(data.departments)) {
          setDepartments(data.departments)
        }
      } catch (error) {
        console.warn("Failed to load departments", error)
      }
    }
    loadDepartments()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (department === "all") {
      setMunicipalities([])
      return
    }

    let active = true
    const loadMunicipalities = async () => {
      try {
        const res = await fetch(`/api/divipole/options?dept=${encodeURIComponent(department)}`)
        if (!res.ok) return
        const data = (await res.json()) as { municipalities?: MunicipalityOption[] }
        if (active && Array.isArray(data.municipalities)) {
          setMunicipalities(data.municipalities)
        }
      } catch (error) {
        console.warn("Failed to load municipalities", error)
      }
    }

    loadMunicipalities()
    return () => {
      active = false
    }
  }, [department])

  const handleDepartmentChange = (value: string) => {
    onDepartmentChange(value)
    onMunicipalityChange("all")
  }

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

        {/* Department Filter */}
        <Select value={department} onValueChange={handleDepartmentChange}>
          <SelectTrigger className="w-full lg:w-48 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.code} value={d.code}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Municipality Filter */}
        <Select value={municipality} onValueChange={onMunicipalityChange}>
          <SelectTrigger className="w-full lg:w-48 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Municipio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {municipalities.map((m) => (
              <SelectItem key={`${m.code}-${m.name}`} value={m.code}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          <Button variant="outline" size="icon" className="bg-transparent">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
