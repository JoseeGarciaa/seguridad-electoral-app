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
  const [department, setDepartment] = useState("all")
  const [municipality, setMunicipality] = useState("all")
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionVersion, setSelectionVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set("limit", "2000")
        if (department !== "all") params.set("dept", department)
        if (municipality !== "all") params.set("muni", municipality)
        if (search) params.set("search", search)
        const res = await fetch(`/api/divipole?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { features?: Feature[] }
        setFeatures(Array.isArray(data.features) ? data.features : [])
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
  }, [department, municipality, search])

  useEffect(() => {
    if (selectedId && !features.some((f) => f.properties.id === selectedId)) {
      setSelectedId(null)
    }
  }, [features, selectedId])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSelectionVersion((v) => v + 1)
  }

  const handleAssign = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) =>
        f.properties.id === id
          ? { ...f, properties: { ...f.properties, delegateAssigned: true } }
          : f
      )
    )
    handleSelect(id)
  }

  const stats = useMemo(() => {
    const total = features.length
    const withCoords = features.filter((f) =>
      Array.isArray(f.geometry.coordinates) &&
      f.geometry.coordinates.length === 2 &&
      f.geometry.coordinates.every((v) => typeof v === "number" && Number.isFinite(v))
    ).length
    const assigned = features.filter((f) => f.properties.delegateAssigned).length
    const coveragePct = total > 0 ? (assigned / total) * 100 : 0
    return { total, withCoords, assigned, coveragePct }
  }, [features])

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Stats */}
      {loading ? (
        <div className="h-20 animate-pulse bg-secondary/50 rounded-xl" />
      ) : (
        <TerritoryStats
          total={stats.total}
          withCoords={stats.withCoords}
          assigned={stats.assigned}
          coveragePct={stats.coveragePct}
        />
      )}

      {/* Filters */}
      <TerritoryFilters
        search={search}
        onSearchChange={setSearch}
        department={department}
        onDepartmentChange={setDepartment}
        municipality={municipality}
        onMunicipalityChange={setMunicipality}
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
              onAssign={handleAssign}
            />
          )}
        </div>
      </div>
    </div>
  )
}
