"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, FileImage, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type Option = {
  value: string
  label: string
}

type OptionsPayload = {
  departments: Option[]
  municipalities: Option[]
  pollingStations: Option[]
  mesas: Option[]
}

const ALL_VALUE = "__all__"

function getFileNameFromHeaders(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) return fallback
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return basicMatch?.[1] ?? fallback
}

async function fetchFilterOptions(filters: {
  department?: string | null
  municipality?: string | null
  pollingStation?: string | null
}): Promise<OptionsPayload> {
  const params = new URLSearchParams({ action: "options" })
  if (filters.department) params.set("department", filters.department)
  if (filters.municipality) params.set("municipality", filters.municipality)
  if (filters.pollingStation) params.set("pollingStation", filters.pollingStation)

  const response = await fetch(`/api/download-center/formularios?${params.toString()}`, { cache: "no-store" })
  if (!response.ok) {
    throw new Error("No se pudieron cargar los filtros")
  }

  const payload = await response.json()
  return {
    departments: Array.isArray(payload?.departments) ? payload.departments : [],
    municipalities: Array.isArray(payload?.municipalities) ? payload.municipalities : [],
    pollingStations: Array.isArray(payload?.pollingStations) ? payload.pollingStations : [],
    mesas: Array.isArray(payload?.mesas) ? payload.mesas : [],
  }
}

export function FormDownloadClient() {
  const [departments, setDepartments] = useState<Option[]>([])
  const [municipalities, setMunicipalities] = useState<Option[]>([])
  const [pollingStations, setPollingStations] = useState<Option[]>([])
  const [mesas, setMesas] = useState<Option[]>([])

  const [department, setDepartment] = useState<string | null>(null)
  const [municipality, setMunicipality] = useState<string | null>(null)
  const [pollingStation, setPollingStation] = useState<string | null>(null)
  const [mesa, setMesa] = useState<string | null>(null)

  const [loadingFilters, setLoadingFilters] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadInitial = async () => {
      setLoadingFilters(true)
      try {
        const payload = await fetchFilterOptions({})
        if (cancelled) return
        setDepartments(payload.departments)
      } catch (error) {
        if (cancelled) return
        toast({ title: "Error", description: "No se cargaron departamentos" })
      } finally {
        if (!cancelled) setLoadingFilters(false)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [])

  const canDownload = useMemo(() => Boolean(department) && !downloading, [department, downloading])

  const onDepartmentChange = async (value: string) => {
    const nextDepartment = value
    setDepartment(nextDepartment)
    setMunicipality(null)
    setPollingStation(null)
    setMesa(null)
    setMunicipalities([])
    setPollingStations([])
    setMesas([])

    setLoadingFilters(true)
    try {
      const payload = await fetchFilterOptions({ department: nextDepartment })
      setMunicipalities(payload.municipalities)
    } catch {
      toast({ title: "Error", description: "No se cargaron municipios" })
    } finally {
      setLoadingFilters(false)
    }
  }

  const onMunicipalityChange = async (value: string) => {
    const nextMunicipality = value === ALL_VALUE ? null : value
    setMunicipality(nextMunicipality)
    setPollingStation(null)
    setMesa(null)
    setPollingStations([])
    setMesas([])

    if (!department || !nextMunicipality) return

    setLoadingFilters(true)
    try {
      const payload = await fetchFilterOptions({
        department,
        municipality: nextMunicipality,
      })
      setPollingStations(payload.pollingStations)
    } catch {
      toast({ title: "Error", description: "No se cargaron puestos" })
    } finally {
      setLoadingFilters(false)
    }
  }

  const onPollingStationChange = async (value: string) => {
    const nextPollingStation = value === ALL_VALUE ? null : value
    setPollingStation(nextPollingStation)
    setMesa(null)
    setMesas([])

    if (!department || !municipality || !nextPollingStation) return

    setLoadingFilters(true)
    try {
      const payload = await fetchFilterOptions({
        department,
        municipality,
        pollingStation: nextPollingStation,
      })
      setMesas(payload.mesas)
    } catch {
      toast({ title: "Error", description: "No se cargaron mesas" })
    } finally {
      setLoadingFilters(false)
    }
  }

  const onMesaChange = (value: string) => {
    setMesa(value === ALL_VALUE ? null : value)
  }

  const handleDownload = async () => {
    if (!department) {
      toast({ title: "Falta filtro", description: "Selecciona un departamento para generar el PDF" })
      return
    }

    setDownloading(true)
    try {
      const params = new URLSearchParams({
        action: "download",
        department,
      })

      if (municipality) params.set("municipality", municipality)
      if (pollingStation) params.set("pollingStation", pollingStation)
      if (mesa) params.set("mesa", mesa)

      const response = await fetch(`/api/download-center/formularios?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const backendMessage = typeof payload?.error === "string" ? payload.error : "No se pudo generar el PDF"
        throw new Error(backendMessage)
      }

      const blob = await response.blob()
      const fileName = getFileNameFromHeaders(
        response.headers.get("content-disposition"),
        "formularios-e14.pdf",
      )

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Descarga iniciada",
        description: `PDF generado: ${fileName}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible generar el PDF"
      toast({ title: "Error de descarga", description: message })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Descarga formularios</h1>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <ShieldCheck className="mr-1 h-3 w-3" /> Solo admin
        </Badge>
      </div>

      <div className="glass rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Evidencias Recientes</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Actas y fotos de mesas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Departamento *</p>
            <Select value={department ?? undefined} onValueChange={onDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Municipio</p>
            <Select
              value={municipality ?? ALL_VALUE}
              onValueChange={onMunicipalityChange}
              disabled={!department || loadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los municipios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos los municipios</SelectItem>
                {municipalities.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Puesto</p>
            <Select
              value={pollingStation ?? ALL_VALUE}
              onValueChange={onPollingStationChange}
              disabled={!department || !municipality || loadingFilters}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los puestos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos los puestos</SelectItem>
                {pollingStations.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Mesa</p>
            <Select value={mesa ?? ALL_VALUE} onValueChange={onMesaChange} disabled={!pollingStation || loadingFilters}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las mesas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas las mesas</SelectItem>
                {mesas.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileImage className="h-4 w-4" />
            PDF tamaño carta con encabezado de identificación (departamento, municipio, puesto y mesa)
          </div>
          <Button onClick={handleDownload} disabled={!canDownload} className="min-w-44">
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {downloading ? "Generando PDF..." : "Descargar formularios"}
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base">Reglas de descarga</CardTitle>
          <CardDescription>
            El filtro es en cascada: departamento → municipio → puesto → mesa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Solo departamento: descarga todos los E14 del departamento.</p>
          <p>• + Municipio: descarga todos los E14 del municipio.</p>
          <p>• + Puesto: descarga todos los E14 del puesto.</p>
          <p>• + Mesa: descarga solo esa mesa.</p>
        </CardContent>
      </Card>
    </div>
  )
}
