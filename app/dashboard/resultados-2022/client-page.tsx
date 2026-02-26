"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Filter, Search, Table as TableIcon } from "lucide-react"

type MesaFactItem = {
  mesaid: string
  depto: string
  municipio: string
  zona: string
  puesto: string
  mesa: number
  votantes: number
  votos_validos: number
  votos_nulos: number
  no_marcados: number
  blancos: number
}

type ResultsPayload = {
  total: number
  items: MesaFactItem[]
  hint?: string
}

const ALL_VALUE = "__all__"

export default function Resultados2022ClientPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [departments, setDepartments] = useState<string[]>([])
  const [municipalities, setMunicipalities] = useState<string[]>([])
  const [puestos, setPuestos] = useState<string[]>([])
  const [mesas, setMesas] = useState<number[]>([])

  const [selectedDepartment, setSelectedDepartment] = useState<string>(ALL_VALUE)
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(ALL_VALUE)
  const [selectedPuesto, setSelectedPuesto] = useState<string>(ALL_VALUE)
  const [selectedMesa, setSelectedMesa] = useState<string>(ALL_VALUE)

  const [results, setResults] = useState<ResultsPayload>({ total: 0, items: [] })

  const selectedFilters = useMemo(
    () => ({
      department: selectedDepartment !== ALL_VALUE ? selectedDepartment : null,
      municipality: selectedMunicipality !== ALL_VALUE ? selectedMunicipality : null,
      puesto: selectedPuesto !== ALL_VALUE ? selectedPuesto : null,
      mesa: selectedMesa !== ALL_VALUE ? selectedMesa : null,
    }),
    [selectedDepartment, selectedMesa, selectedMunicipality, selectedPuesto],
  )

  const canQueryResults = Boolean(
    selectedFilters.department && selectedFilters.municipality && selectedFilters.puesto && selectedFilters.mesa,
  )

  const summary = useMemo(() => {
    return results.items.reduce(
      (acc, row) => {
        acc.mesas += 1
        acc.votantes += Number(row.votantes ?? 0)
        acc.validos += Number(row.votos_validos ?? 0)
        acc.nulos += Number(row.votos_nulos ?? 0)
        acc.blancos += Number(row.blancos ?? 0)
        return acc
      },
      { mesas: 0, votantes: 0, validos: 0, nulos: 0, blancos: 0 },
    )
  }, [results.items])

  const buildQuery = useCallback(
    (scope: "departments" | "municipalities" | "puestos" | "mesas" | "results") => {
      const params = new URLSearchParams()
      params.set("scope", scope)
      if (selectedFilters.department) params.set("department", selectedFilters.department)
      if (selectedFilters.municipality) params.set("municipality", selectedFilters.municipality)
      if (selectedFilters.puesto) params.set("puesto", selectedFilters.puesto)
      if (selectedFilters.mesa) params.set("mesa", selectedFilters.mesa)
      return params.toString()
    },
    [selectedFilters.department, selectedFilters.mesa, selectedFilters.municipality, selectedFilters.puesto],
  )

  const loadDepartments = useCallback(async () => {
    const res = await fetch(`/api/resultados-2022?${buildQuery("departments")}`, { cache: "no-store" })
    if (!res.ok) throw new Error("No se pudieron cargar departamentos")
    const json = await res.json()
    setDepartments(Array.isArray(json.items) ? json.items : [])
  }, [buildQuery])

  const loadMunicipalities = useCallback(async () => {
    if (!selectedFilters.department) {
      setMunicipalities([])
      return
    }

    const res = await fetch(`/api/resultados-2022?${buildQuery("municipalities")}`, { cache: "no-store" })
    if (!res.ok) throw new Error("No se pudieron cargar municipios")
    const json = await res.json()
    setMunicipalities(Array.isArray(json.items) ? json.items : [])
  }, [buildQuery, selectedFilters.department])

  const loadPuestos = useCallback(async () => {
    if (!selectedFilters.department || !selectedFilters.municipality) {
      setPuestos([])
      return
    }

    const res = await fetch(`/api/resultados-2022?${buildQuery("puestos")}`, { cache: "no-store" })
    if (!res.ok) throw new Error("No se pudieron cargar puestos")
    const json = await res.json()
    setPuestos(Array.isArray(json.items) ? json.items : [])
  }, [buildQuery, selectedFilters.department, selectedFilters.municipality])

  const loadMesas = useCallback(async () => {
    if (!selectedFilters.department || !selectedFilters.municipality || !selectedFilters.puesto) {
      setMesas([])
      return
    }

    const res = await fetch(`/api/resultados-2022?${buildQuery("mesas")}`, { cache: "no-store" })
    if (!res.ok) throw new Error("No se pudieron cargar mesas")
    const json = await res.json()
    setMesas(
      Array.isArray(json.items)
        ? json.items.map((value: any) => Number(value)).filter((v: number) => Number.isInteger(v))
        : [],
    )
  }, [buildQuery, selectedFilters.department, selectedFilters.municipality, selectedFilters.puesto])

  const loadResults = useCallback(async () => {
    if (!canQueryResults) {
      setResults({ total: 0, items: [], hint: "Selecciona departamento, municipio, puesto y mesa para consultar." })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/resultados-2022?${buildQuery("results")}`, { cache: "no-store" })
      if (!res.ok) throw new Error("No se pudieron cargar resultados")
      const json = await res.json()
      setResults({
        total: Number(json.total ?? 0),
        items: Array.isArray(json.items) ? json.items : [],
        hint: typeof json.hint === "string" ? json.hint : undefined,
      })
    } catch (err: any) {
      setError(err?.message ?? "No se pudieron cargar resultados")
      setResults({ total: 0, items: [] })
    } finally {
      setLoading(false)
    }
  }, [buildQuery, canQueryResults])

  useEffect(() => {
    loadDepartments().catch((err) => setError(err?.message ?? "No se pudieron cargar departamentos"))
  }, [loadDepartments])

  useEffect(() => {
    loadMunicipalities().catch((err) => setError(err?.message ?? "No se pudieron cargar municipios"))
  }, [loadMunicipalities])

  useEffect(() => {
    loadPuestos().catch((err) => setError(err?.message ?? "No se pudieron cargar puestos"))
  }, [loadPuestos])

  useEffect(() => {
    loadMesas().catch((err) => setError(err?.message ?? "No se pudieron cargar mesas"))
  }, [loadMesas])

  useEffect(() => {
    loadResults().catch((err) => setError(err?.message ?? "No se pudieron cargar resultados"))
  }, [loadResults])

  const handleDepartmentChange = (value: string) => {
    setSelectedDepartment(value)
    setSelectedMunicipality(ALL_VALUE)
    setSelectedPuesto(ALL_VALUE)
    setSelectedMesa(ALL_VALUE)
  }

  const handleMunicipalityChange = (value: string) => {
    setSelectedMunicipality(value)
    setSelectedPuesto(ALL_VALUE)
    setSelectedMesa(ALL_VALUE)
  }

  const handlePuestoChange = (value: string) => {
    setSelectedPuesto(value)
    setSelectedMesa(ALL_VALUE)
  }

  const handleMesaChange = (value: string) => {
    setSelectedMesa(value)
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6 notranslate" translate="no" suppressHydrationWarning>
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="font-semibold text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Resultados 2022 · Filtros en cascada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground">Departamento</p>
              <Select value={selectedDepartment} onValueChange={handleDepartmentChange}>
                <SelectTrigger className="w-full min-w-0 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Seleccione</SelectItem>
                  {departments.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground">Municipio</p>
              <Select value={selectedMunicipality} onValueChange={handleMunicipalityChange} disabled={!selectedFilters.department}>
                <SelectTrigger className="w-full min-w-0 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Seleccione</SelectItem>
                  {municipalities.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground">Puesto de votación</p>
              <Select value={selectedPuesto} onValueChange={handlePuestoChange} disabled={!selectedFilters.department || !selectedFilters.municipality}>
                <SelectTrigger className="w-full min-w-0 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Seleccione</SelectItem>
                  {puestos.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground">Mesa</p>
              <Select value={selectedMesa} onValueChange={handleMesaChange} disabled={!selectedFilters.department || !selectedFilters.municipality || !selectedFilters.puesto}>
                <SelectTrigger className="w-full min-w-0 bg-zinc-800/50 border-zinc-700">
                  <SelectValue placeholder="Seleccione mesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Seleccione</SelectItem>
                  {mesas.map((value) => (
                    <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="bg-zinc-800/60 border-zinc-700"
              onClick={() => loadResults()}
              disabled={!canQueryResults}
              suppressHydrationWarning
              translate="no"
            >
              <Search className="h-4 w-4 mr-2" /> <span suppressHydrationWarning>Consultar</span>
            </Button>

            <Badge className="bg-zinc-800 border-zinc-700 text-xs">
              Resultados mostrados: {results.total}
            </Badge>

            {!canQueryResults && (
              <p className="text-xs text-muted-foreground">Para consultar, selecciona departamento, municipio, puesto y mesa.</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="font-semibold text-base flex items-center gap-2">
            <TableIcon className="h-4 w-4" /> Resultado de mesa (visual fija)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Cargando resultados...</p>}

          {!loading && results.items.length === 0 && (
            <p className="text-sm text-muted-foreground">{results.hint ?? "No hay resultados para el filtro seleccionado."}</p>
          )}

          {!loading && results.items.length > 0 && (
            <div className="grid gap-3">
              {results.items.map((row) => (
                <div key={row.mesaid} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Departamento</p>
                      <p className="text-sm font-semibold wrap-break-word">{row.depto}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Municipio</p>
                      <p className="text-sm font-semibold wrap-break-word">{row.municipio}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Zona</p>
                      <p className="text-sm font-semibold wrap-break-word">{row.zona}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 sm:col-span-2 lg:col-span-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Puesto de votación</p>
                      <p className="text-sm font-semibold wrap-break-word">{row.puesto}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Mesa</p>
                      <p className="text-sm font-semibold">{row.mesa}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Votantes</p>
                      <p className="text-sm font-semibold">{row.votantes}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Votos válidos</p>
                      <p className="text-sm font-semibold">{row.votos_validos}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Votos nulos</p>
                      <p className="text-sm font-semibold">{row.votos_nulos}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">No marcados</p>
                      <p className="text-sm font-semibold">{row.no_marcados}</p>
                    </div>
                    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Blancos</p>
                      <p className="text-sm font-semibold">{row.blancos}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {results.items.length > 0 && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="font-semibold text-base">Resumen del puesto consultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-muted-foreground">Mesas</p>
                <p className="text-xl font-semibold text-foreground">{summary.mesas}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-muted-foreground">Votantes</p>
                <p className="text-xl font-semibold text-foreground">{summary.votantes}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-muted-foreground">Votos válidos</p>
                <p className="text-xl font-semibold text-foreground">{summary.validos}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-muted-foreground">Votos nulos</p>
                <p className="text-xl font-semibold text-foreground">{summary.nulos}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <p className="text-xs text-muted-foreground">Votos en blanco</p>
                <p className="text-xl font-semibold text-foreground">{summary.blancos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
