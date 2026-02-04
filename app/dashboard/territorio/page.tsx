"use client"

import { useEffect, useMemo, useState } from "react"
import { TerritoryMap } from "@/components/territorio/territory-map"
import { TerritoryFilters } from "@/components/territorio/territory-filters"
import { TerritoryTable } from "@/components/territorio/territory-table"
import { TerritoryStats } from "@/components/territorio/territory-stats"

type Feature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    id: string
    departamento: string
    municipio: string
    puesto: string
    direccion: string | null
    mesas: number
    total: number
    hombres: number
    mujeres: number
    dd?: string
    mm?: string
    pp?: string
    delegateAssigned?: boolean
  }
}

export default function TerritorioPage() {
  const [viewMode, setViewMode] = useState<"circle" | "heatmap" | "3d">("circle")
  const [search, setSearch] = useState("")
  const [features, setFeatures] = useState<Feature[]>([])
  const [totals, setTotals] = useState<{ total_puestos: number; total_mesas: number; with_coords: number }>(
    { total_puestos: 0, total_mesas: 0, with_coords: 0 }
  )
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionVersion, setSelectionVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/my/territory`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          features?: Feature[]
          totals?: { total_puestos?: number; total_mesas?: number; with_coords?: number }
        }
        setFeatures(Array.isArray(data.features) ? data.features : [])
        setTotals({
          total_puestos: Number(data.totals?.total_puestos ?? 0),
          total_mesas: Number(data.totals?.total_mesas ?? 0),
          with_coords: Number(data.totals?.with_coords ?? 0),
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error loading divipole data", error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selectedId && !features.some((f) => f.properties.id === selectedId)) {
      setSelectedId(null)
    }
  }, [features, selectedId])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSelectionVersion((v) => v + 1)
  }

  const stats = useMemo(() => {
    const mesas = totals.total_mesas
    const puestos = Array.from(new Set(features.map((f) => f.properties.puesto).filter(Boolean)))
    const puestoLabel = puestos.length === 0 ? "Sin puesto asignado" : puestos.length === 1 ? puestos[0] : `${puestos[0]} +${puestos.length - 1} más`
    return { mesas, puestoLabel }
  }, [features, totals])

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Stats */}
      {loading ? (
        <div className="h-20 animate-pulse bg-secondary/50 rounded-xl" />
      ) : (
        <TerritoryStats puestoLabel={stats.puestoLabel} mesas={stats.mesas} />
      )}

      {/* Filters */}
      <TerritoryFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Map and Table */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Map - Takes 3 columns */}
        <div className="lg:col-span-3 h-[500px] lg:h-[600px]">
          {loading ? (
            <div className="h-full animate-pulse bg-secondary/50 rounded-xl" />
          ) : (
            <TerritoryMap
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              features={features}
              selectedId={selectedId}
              onSelect={handleSelect}
              selectionVersion={selectionVersion}
            />
          )}
        </div>

        {/* Table - Takes 2 columns */}
        <div className="lg:col-span-2 h-[500px] lg:h-[600px]">
          {loading ? (
            <div className="h-full animate-pulse bg-secondary/50 rounded-xl" />
          ) : (
            <TerritoryTable
              features={features}
              search={search}
              onSearchChange={setSearch}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>
    </div>
  )
}
