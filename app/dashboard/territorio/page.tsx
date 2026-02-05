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
    delegateName?: string | null
    delegateEmail?: string | null
    delegatePhone?: string | null
    votersPerMesa?: number | null
  }
}

type Totals = { total_puestos: number; total_mesas: number; with_coords: number; total_voters: number }

export default function TerritorioPage() {
  const [viewMode, setViewMode] = useState<"circle" | "heatmap" | "3d">("circle")
  const [search, setSearch] = useState("")
  const [features, setFeatures] = useState<Feature[]>([])
  const [totals, setTotals] = useState<Totals>({ total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0 })
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/my/territory`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { features?: Feature[]; totals?: Partial<Totals> }
        setFeatures(Array.isArray(data.features) ? data.features : [])
        setTotals({
          total_puestos: Number(data.totals?.total_puestos ?? 0),
          total_mesas: Number(data.totals?.total_mesas ?? 0),
          with_coords: Number(data.totals?.with_coords ?? 0),
          total_voters: Number((data as any)?.totals?.total_voters ?? (data as any)?.totals?.total_votes ?? 0),
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
    if (selectedMunicipality && !features.some((f) => f.properties.municipio === selectedMunicipality)) {
      setSelectedMunicipality(null)
    }
  }, [features, selectedMunicipality])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSelectionVersion((v) => v + 1)
  }

  const departments = useMemo(() => {
    const set = new Set<string>()
    features.forEach((f) => {
      if (f.properties.departamento) set.add(f.properties.departamento)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [features])

  const municipalities = useMemo(() => {
    const set = new Set<string>()
    features.forEach((f) => {
      if (selectedDepartment && f.properties.departamento !== selectedDepartment) return
      if (f.properties.municipio) set.add(f.properties.municipio)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [features, selectedDepartment])

  const filteredFeatures = useMemo(() => {
    const term = search.trim().toLowerCase()
    return features.filter((f) => {
      const matchesDepartment = selectedDepartment ? f.properties.departamento === selectedDepartment : true
      const matchesMunicipality = selectedMunicipality ? f.properties.municipio === selectedMunicipality : true

      const matchesSearch = term
        ? [
            f.properties.puesto,
            f.properties.municipio,
            f.properties.departamento,
            f.properties.direccion ?? "",
            f.properties.pp ?? "",
            f.properties.mm ?? "",
            f.properties.dd ?? "",
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(term))
        : true

      return matchesDepartment && matchesMunicipality && matchesSearch
    })
  }, [features, search, selectedDepartment, selectedMunicipality])

  const filteredTotals = useMemo(() => {
    return filteredFeatures.reduce(
      (acc, feature) => {
        acc.total_puestos += 1
        acc.total_mesas += Number(feature.properties.mesas ?? 0)
        acc.total_voters += Number(feature.properties.total ?? 0)
        const [lng, lat] = feature.geometry.coordinates
        if (lng !== 0 && lat !== 0) acc.with_coords += 1
        return acc
      },
      { total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0 },
    )
  }, [filteredFeatures])

  useEffect(() => {
    if (selectedId && !filteredFeatures.some((f) => f.properties.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filteredFeatures, selectedId])

  const statsSource = useMemo(() => {
    const hasFilters = Boolean(search.trim() || selectedDepartment || selectedMunicipality)
    return hasFilters ? filteredTotals : totals
  }, [filteredTotals, totals, search, selectedDepartment, selectedMunicipality])

  const stats = useMemo(
    () => ({
      puestosCount: statsSource.total_puestos,
      mesas: statsSource.total_mesas,
      votantes: statsSource.total_voters,
      puestosConCoord: statsSource.with_coords,
    }),
    [statsSource],
  )

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Stats */}
      {loading ? (
        <div className="h-20 animate-pulse bg-secondary/50 rounded-xl" />
      ) : (
        <TerritoryStats
          totalPuestos={stats.puestosCount}
          totalMesas={stats.mesas}
          totalVotantes={stats.votantes}
          puestosConCoord={stats.puestosConCoord}
        />
      )}

      {/* Filters */}
      <TerritoryFilters
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        departments={departments}
        municipalities={municipalities}
        selectedDepartment={selectedDepartment}
        selectedMunicipality={selectedMunicipality}
        onDepartmentChange={(value) => {
          setSelectedDepartment(value || null)
          setSelectedMunicipality(null)
        }}
        onMunicipalityChange={(value) => setSelectedMunicipality(value || null)}
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
              features={filteredFeatures}
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
              features={filteredFeatures}
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
