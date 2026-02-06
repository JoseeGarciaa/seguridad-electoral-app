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
    reportedMesas?: number
  }
}

type Totals = { total_puestos: number; total_mesas: number; with_coords: number; total_voters: number; reported_mesas?: number }

export default function TerritorioPage() {
  const [viewMode, setViewMode] = useState<"circle" | "heatmap" | "3d">("circle")
  const [search, setSearch] = useState("")
  const [features, setFeatures] = useState<Feature[]>([])
  const [totals, setTotals] = useState<Totals>({ total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0, reported_mesas: 0 })
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null) // dept code
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null) // muni code
  const [departments, setDepartments] = useState<Array<{ code: string; name: string }>>([])
  const [municipalities, setMunicipalities] = useState<Array<{ code: string; name: string }>>([])
  const [hasHydrated, setHasHydrated] = useState(false)
  const CACHE_KEY = "territory-cache-v1"
  const lastFetchedKeyRef = useMemo(() => ({ current: "" }), [])
  const lastPersistedKeyRef = useMemo(() => ({ current: "" }), [])

  // Cargar catálogos ligeros (departamentos y municipios) para evitar traer todos los puestos de entrada.
  useEffect(() => {
    const controller = new AbortController()
    const loadDepartments = async () => {
      try {
        const res = await fetch(`/api/divipole/options`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        const deps = Array.isArray(data.departments) ? data.departments : []
        setDepartments(deps)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error loading departments", error)
        }
      }
    }

    loadDepartments()
    return () => controller.abort()
  }, [])

  // Rehidratar último estado (filtros, datos) desde sessionStorage para evitar refetch al volver.
  useEffect(() => {
    if (hasHydrated) return
    if (typeof window === "undefined") return
    try {
      const raw = sessionStorage.getItem(CACHE_KEY)
      if (!raw) {
        setHasHydrated(true)
        return
      }
      const parsed = JSON.parse(raw)
      if (parsed.viewMode) setViewMode(parsed.viewMode)
      if (typeof parsed.search === "string") setSearch(parsed.search)
      if (parsed.selectedDepartment) setSelectedDepartment(parsed.selectedDepartment)
      if (parsed.selectedMunicipality) setSelectedMunicipality(parsed.selectedMunicipality)
      if (Array.isArray(parsed.features)) setFeatures(parsed.features)
      if (parsed.totals) setTotals(parsed.totals)
      if (parsed.selectedId) setSelectedId(parsed.selectedId)
    } catch (err) {
      console.error("territory cache hydrate error", err)
    } finally {
      setHasHydrated(true)
    }
  }, [hasHydrated])

  // Cargar municipios cuando se elige un departamento.
  useEffect(() => {
    const controller = new AbortController()
    const loadMunicipalities = async () => {
      setMunicipalities([])
      if (!selectedDepartment) return
      try {
        const res = await fetch(`/api/divipole/options?dept=${encodeURIComponent(selectedDepartment)}`, { signal: controller.signal })
        if (!res.ok) return
        const data = await res.json()
        const munis = Array.isArray(data.municipalities) ? data.municipalities : []
        setMunicipalities(munis)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error loading municipalities", error)
        }
      }
    }

    loadMunicipalities()
    return () => controller.abort()
  }, [selectedDepartment])

  const selectedDepartmentName = useMemo(
    () => departments.find((d) => d.code === selectedDepartment)?.name ?? null,
    [departments, selectedDepartment],
  )
  const selectedMunicipalityName = useMemo(
    () => municipalities.find((m) => m.code === selectedMunicipality)?.name ?? null,
    [municipalities, selectedMunicipality],
  )

  // Traer puestos solo cuando hay departamento y municipio seleccionados; evita cargar todo el país.
  useEffect(() => {
    const controller = new AbortController()
    const fetchData = async () => {
      if (!selectedDepartment || !selectedMunicipality) {
        setFeatures([])
        setTotals({ total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0, reported_mesas: 0 })
        return
      }
      const fetchKey = `${selectedDepartment}|${selectedMunicipality}|${search.trim().toLowerCase()}`
      if (hasHydrated && lastFetchedKeyRef.current === fetchKey && features.length > 0) {
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedDepartmentName) params.set("department", selectedDepartmentName)
        if (selectedMunicipalityName) params.set("municipality", selectedMunicipalityName)
        if (search.trim()) params.set("search", search.trim())
        params.set("limit", "6000")

        const res = await fetch(`/api/my/territory?${params.toString()}`, {
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
          reported_mesas: Number((data as any)?.totals?.reported_mesas ?? 0),
        })
        lastFetchedKeyRef.current = fetchKey
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
  }, [selectedDepartment, selectedMunicipality, selectedDepartmentName, selectedMunicipalityName, search, hasHydrated, lastFetchedKeyRef, features.length])

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSelectionVersion((v) => v + 1)
  }

  const filteredFeatures = useMemo(() => {
    const term = search.trim().toLowerCase()
    return features.filter((f) => {
      const matchesDepartment = selectedDepartmentName ? f.properties.departamento === selectedDepartmentName : true
      const matchesMunicipality = selectedMunicipalityName ? f.properties.municipio === selectedMunicipalityName : true

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
  }, [features, search, selectedDepartmentName, selectedMunicipalityName])

  const filteredTotals = useMemo(() => {
    return filteredFeatures.reduce(
      (acc, feature) => {
        acc.total_puestos += 1
        acc.total_mesas += Number(feature.properties.mesas ?? 0)
        acc.total_voters += Number(feature.properties.total ?? 0)
        acc.reported_mesas += Number(feature.properties.reportedMesas ?? 0)
        const [lng, lat] = feature.geometry.coordinates
        if (lng !== 0 && lat !== 0) acc.with_coords += 1
        return acc
      },
      { total_puestos: 0, total_mesas: 0, with_coords: 0, total_voters: 0, reported_mesas: 0 },
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
      mesasReportadas: statsSource.reported_mesas ?? 0,
    }),
    [statsSource],
  )

  const assignmentStats = useMemo(() => {
    const puestosAsignados = filteredFeatures.filter((feature) => feature.properties.delegateAssigned).length
    const puestosReportados = filteredFeatures.filter((feature) => Number(feature.properties.reportedMesas ?? 0) > 0).length
    const cobertura = puestosAsignados === 0 ? 0 : Math.min(100, Math.round((puestosReportados / puestosAsignados) * 100))

    return {
      mesasAsignadas: puestosAsignados,
      mesasReportadas: puestosReportados,
      cobertura,
    }
  }, [filteredFeatures])

  // Persist estado en sessionStorage para reusar al regresar.
  useEffect(() => {
    if (!hasHydrated) return
    if (typeof window === "undefined") return
    const cacheKey = `${selectedDepartment ?? ""}|${selectedMunicipality ?? ""}|${search.trim().toLowerCase()}`
    // Avoid re-serializing if key unchanged
    if (lastPersistedKeyRef.current === cacheKey) return
    const payload = {
      viewMode,
      search,
      selectedDepartment,
      selectedMunicipality,
      selectedId,
      totals,
      features,
    }
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
      lastPersistedKeyRef.current = cacheKey
    } catch (err) {
      console.error("territory cache persist error", err)
    }
  }, [hasHydrated, viewMode, search, selectedDepartment, selectedMunicipality, selectedId, totals, features, lastPersistedKeyRef])

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
          mesasAsignadas={assignmentStats.mesasAsignadas}
          mesasReportadas={assignmentStats.mesasReportadas}
          cobertura={assignmentStats.cobertura}
        />
      )}

      {/* Filters */}
      <TerritoryFilters
        search={search}
        onSearchChange={setSearch}
        departments={departments}
        municipalities={municipalities}
        selectedDepartment={selectedDepartment}
        selectedMunicipality={selectedMunicipality}
        onDepartmentChange={(value) => {
          setSelectedDepartment(value || null)
          setSelectedMunicipality(null)
          setSelectedId(null)
          setFeatures([])
        }}
        onMunicipalityChange={(value) => {
          setSelectedMunicipality(value || null)
          setSelectedId(null)
          setFeatures([])
        }}
      />

      {/* Map and Table */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Map - Takes 3 columns */}
        <div className="lg:col-span-3 h-[500px] lg:h-[600px]">
          {loading ? (
            <div className="h-full animate-pulse bg-secondary/50 rounded-xl" />
          ) : filteredFeatures.length === 0 ? (
            <div className="h-full rounded-xl border border-dashed border-border/60 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
              Selecciona un departamento y un municipio para cargar los puestos de votación.
            </div>
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
