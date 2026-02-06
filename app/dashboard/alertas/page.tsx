"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  MapPin,
  Shield,
  Clock,
  Filter,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type AlertItem = {
  id: string
  title: string
  level: "crítica" | "alta" | "media"
  category: string
  municipality: string
  department?: string
  time: string
  status: "abierta" | "en análisis" | "enviada" | "atendida" | "resuelta"
  detail: string
  photos?: string[]
  delegateName?: string
  statusLabel?: "abierta" | "atendida" | "resuelta"
}

type MesaAsignada = {
  id: string
  label?: string
  polling_station_code?: string
  municipality?: string
  department?: string
}

const levelColor: Record<string, string> = {
  crítica: "bg-red-500/20 text-red-300",
  alta: "bg-amber-500/20 text-amber-300",
  media: "bg-cyan-500/20 text-cyan-300",
};

const statusColor: Record<string, string> = {
  abierta: "bg-zinc-500/20 text-zinc-100",
  "en análisis": "bg-purple-500/20 text-purple-200",
  enviada: "bg-emerald-500/20 text-emerald-200",
  atendida: "bg-amber-500/20 text-amber-200",
  resuelta: "bg-emerald-500/20 text-emerald-200",
};

export default function AlertasPage() {
  const [data, setData] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState("todas")
  const [stats, setStats] = useState({ total: 0, criticas: 0, abiertas: 0 })
  const [mesas, setMesas] = useState<MesaAsignada[]>([])
  const [scopeType, setScopeType] = useState<"puesto" | "mesa" | "">("puesto")
  const [selectedMesa, setSelectedMesa] = useState<string>("")
  const [selectedPuesto, setSelectedPuesto] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [photoData, setPhotoData] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [levelValue, setLevelValue] = useState<"crítica" | "alta" | "media">("alta")
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<AlertItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const mapApiAlerts = useCallback((payload: any) => {
    const items: AlertItem[] = Array.isArray(payload?.items) ? payload.items : []
    const statsPayload = {
      total: Number(payload?.stats?.total ?? items.length),
      criticas: Number(payload?.stats?.criticas ?? 0),
      abiertas: Number(payload?.stats?.abiertas ?? 0),
    }
    return { items, statsPayload, viewerRole: payload?.viewerRole ?? null }
  }, [])

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/alerts", { cache: "no-store" })
    if (!res.ok) throw new Error("No se pudo cargar alertas")
    const json = await res.json()
    return mapApiAlerts(json)
  }, [mapApiAlerts])

  const fetchAlertsRef = useRef(fetchAlerts)
  useEffect(() => {
    fetchAlertsRef.current = fetchAlerts
  }, [fetchAlerts])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const { items, statsPayload, viewerRole } = await fetchAlertsRef.current()
        if (cancelled) return
        setData(items)
        setStats(statsPayload)
        setViewerRole(viewerRole ?? null)
      } catch (err: any) {
        console.error(err)
        toast({ title: "Alertas", description: err?.message ?? "No se pudo cargar" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : ""
    if (!hash) return
    const found = data.find((d) => d.id === hash)
    if (found) {
      setSelected(found)
      setDetailOpen(true)
    }
  }, [loading, data])

  useEffect(() => {
    let cancelled = false
    const loadMesas = async () => {
      try {
        const res = await fetch("/api/mesas-asignadas", { cache: "no-store" })
        if (!res.ok) {
          setMesas([])
          return
        }
        const json = await res.json()
        if (cancelled) return
        const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []
        const mapped: MesaAsignada[] = items.map((m: any) => ({
          id: String(m.id ?? m.mesa_id ?? `${Date.now()}-${Math.random()}`),
          label: m.label ?? m.nombre_mesa ?? m.nombre ?? m.codigo ?? "Mesa",
          polling_station_code: m.polling_station_code ?? m.codigo_puesto ?? m.puesto ?? null,
          municipality: m.municipality ?? m.municipio ?? null,
          department: m.department ?? m.departamento ?? null,
        }))
        setMesas(mapped)
      } catch (err: any) {
        console.error(err)
        setMesas([])
      }
    }
    loadMesas()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return data.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.municipality.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = level === "todas" || a.level === level;
      return matchesSearch && matchesLevel;
    });
  }, [data, level, search]);

  const puestos = useMemo(() => {
    const map = new Map<string, string>()
    mesas.forEach((m) => {
      const code = m.polling_station_code ?? ""
      if (!code) return
      if (!map.has(code)) {
        const label = `Puesto ${code}${m.municipality ? ` · ${m.municipality}` : ""}`
        map.set(code, label)
      }
    })
    return Array.from(map.entries()).map(([code, label]) => {
      const match = mesas.find((m) => m.polling_station_code === code)
      return {
        code,
        label,
        municipality: match?.municipality ?? null,
        department: match?.department ?? null,
      }
    })
  }, [mesas])

  const isAdmin = viewerRole === "admin"
  const headerGridClass = isAdmin ? "grid gap-4 md:grid-cols-4" : "grid gap-4 md:grid-cols-3"
  const statusGridClass = isAdmin ? "grid gap-3 grid-cols-2 md:grid-cols-4" : "grid gap-3 sm:grid-cols-2"
  const resolvedCount = useMemo(() => {
    return data.filter((item) => (item.statusLabel ?? item.status) === "resuelta").length
  }, [data])

  const onFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const readers = Array.from(files).map((file) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      }),
    )
    try {
      const results = await Promise.all(readers)
      setPhotoData((prev) => [...prev, ...results.filter(Boolean)])
    } catch (err) {
      console.error(err)
      toast({ title: "Archivos", description: "No se pudieron leer algunas fotos" })
    }
  }

  const handleCreate = async () => {
    if (!scopeType) {
      toast({ title: "Alerta", description: "Selecciona si es para puesto o mesa" })
      return
    }

    const mesaObj = mesas.find((m) => m.id === selectedMesa)
    const puestoObj = puestos.find((p) => p.code === selectedPuesto)
    const pollingStationCode = scopeType === "mesa" ? mesaObj?.polling_station_code : puestoObj?.code
    const municipality = scopeType === "mesa" ? mesaObj?.municipality ?? null : puestoObj?.municipality ?? null
    const department = scopeType === "mesa" ? mesaObj?.department ?? null : puestoObj?.department ?? null

    if (scopeType === "mesa" && !mesaObj) {
      toast({ title: "Alerta", description: "Selecciona la mesa asignada" })
      return
    }
    if (scopeType === "puesto" && !puestoObj) {
      toast({ title: "Alerta", description: "Selecciona el puesto asignado" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scopeType,
          pollingStationCode,
          mesaLabel: mesaObj?.label,
          municipality,
          department,
          notes,
          photos: photoData,
          level: levelValue,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error ?? "No se pudo crear la alerta")
      }

      const created = await res.json()
      setData((prev) => [created, ...prev])
      setStats((prev) => ({
        total: prev.total + 1,
        criticas: prev.criticas + 1,
        abiertas: prev.abiertas + 1,
      }))
      setNotes("")
      setPhotoData([])
      setSelectedMesa("")
      setSelectedPuesto("")
      setLevelValue("alta")
      toast({ title: "Alerta", description: "Alerta creada" })
    } catch (err: any) {
      console.error(err)
      toast({ title: "Alerta", description: err?.message ?? "No se pudo crear" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (alerta: AlertItem, nextStatus: "atendida" | "resuelta") => {
    if (alerta.category !== "alerta") {
      toast({ title: "Alertas", description: "Solo las alertas manuales se pueden marcar" })
      return
    }

    setUpdating(true)
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: alerta.id, status: nextStatus }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.error ?? "No se pudo actualizar")
      }

      const json = await res.json()
      const updatedStatus = (json.status as AlertItem["statusLabel"]) ?? nextStatus

      setData((prev) => prev.map((item) => (item.id === alerta.id ? { ...item, status: updatedStatus, statusLabel: updatedStatus } : item)))
      setSelected((prev) => (prev && prev.id === alerta.id ? { ...prev, status: updatedStatus, statusLabel: updatedStatus } : prev))

      // Refresh from server to ensure persistence across navigations
      try {
        const { items, statsPayload, viewerRole } = await fetchAlerts()
        setData(items)
        setStats(statsPayload)
        setViewerRole(viewerRole ?? null)
        setSelected((prev) => (prev ? items.find((i) => i.id === prev.id) ?? prev : prev))
      } catch (refreshErr) {
        console.error(refreshErr)
      }
      toast({ title: "Alertas", description: "Estado actualizado" })
    } catch (err: any) {
      toast({ title: "Alertas", description: err?.message ?? "No se pudo actualizar" })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-10">
      <Card className="border-0 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-900 text-white shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-4 text-lg">
            <div>
              <p className="text-sm text-cyan-100/80">Tablero de alertas</p>
              <h1 className="text-2xl font-semibold">Monitorea y escale incidentes electorales</h1>
            </div>
            <Badge className="bg-white/15 text-white border-white/20">Tiempo real</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className={headerGridClass}>
          {!isAdmin && (
            <div className="md:col-span-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex items-center gap-2 text-sm text-cyan-100/90">
                  <Upload className="h-4 w-4" /> Crear alerta manual
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs text-white/70">Tipo de destino</p>
                    <Select value={scopeType} onValueChange={(v) => setScopeType(v as "puesto" | "mesa")}>
                      <SelectTrigger className="bg-white/10 border-white/15 text-white">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="puesto">Puesto asignado</SelectItem>
                        <SelectItem value="mesa">Mesa asignada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scopeType === "puesto" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/70">Puesto</p>
                      <Select value={selectedPuesto || undefined} onValueChange={setSelectedPuesto}>
                        <SelectTrigger className="bg-white/10 border-white/15 text-white">
                          <SelectValue placeholder="Selecciona puesto" />
                        </SelectTrigger>
                        <SelectContent>
                          {puestos.length === 0 && <SelectItem value="__sin_puestos" disabled>Sin puestos</SelectItem>}
                          {puestos.map((p) => (
                            <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-white/70">Mesa</p>
                      <Select value={selectedMesa || undefined} onValueChange={setSelectedMesa}>
                        <SelectTrigger className="bg-white/10 border-white/15 text-white">
                          <SelectValue placeholder="Selecciona mesa" />
                        </SelectTrigger>
                        <SelectContent>
                          {mesas.length === 0 && <SelectItem value="__sin_mesas" disabled>Sin mesas</SelectItem>}
                          {mesas.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label ?? "Mesa"}{m.polling_station_code ? ` · Puesto ${m.polling_station_code}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <p className="text-xs text-white/70">Notas</p>
                    <Textarea
                      placeholder="Describe la alerta"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-white/10 border-white/15 text-white h-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-white/70">Nivel</p>
                    <Select value={levelValue} onValueChange={(v) => setLevelValue(v as "crítica" | "alta" | "media")}>
                      <SelectTrigger className="bg-white/10 border-white/15 text-white">
                        <SelectValue placeholder="Nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crítica">Crítica</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-white/70">Evidencia</p>
                    <div className="flex items-center gap-3">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onFilesSelected(e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
                      >
                        <ImageIcon className="h-4 w-4" /> Agregar fotos
                      </button>
                      {photoData.length > 0 && (
                        <Badge className="bg-white/10 border-white/15 text-white">{photoData.length} foto(s) listas</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                  <span>Se enviará al canal de seguridad electoral</span>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-md bg-white text-slate-900 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
                  >
                    {submitting ? "Enviando..." : "Crear alerta"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={`space-y-3 ${isAdmin ? "md:col-span-4" : ""}`}>
            <p className="text-sm text-white/70">Estado rapido</p>
            <div className={statusGridClass}>
              <Card className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Alertas totales</p>
                      <p className="text-2xl font-semibold">{stats.total}</p>
                    </div>
                    <Bell className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Criticas</p>
                      <p className="text-2xl font-semibold">{stats.criticas}</p>
                    </div>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Abiertas</p>
                      <p className="text-2xl font-semibold">{stats.abiertas}</p>
                    </div>
                    <Shield className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/10 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">Resueltas</p>
                      <p className="text-2xl font-semibold">{resolvedCount}</p>
                    </div>
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Buscar por nombre o municipio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 md:col-span-2"
          />
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="crítica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-sm text-muted-foreground">Cargando alertas...</CardContent>
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-sm text-muted-foreground">Sin alertas de incumplimiento.</CardContent>
          </Card>
        )}
        {!loading && filtered.map((alerta) => {
          const isCritica = alerta.level === "crítica"
          const statusDisplay = alerta.statusLabel ?? alerta.status

          return (
          <Card
            key={alerta.id}
            id={alerta.id}
            className={`bg-zinc-900/60 border-zinc-800 overflow-hidden ${isCritica ? "border-red-500/70 ring-2 ring-red-500/40" : ""}`}
          >
            <div className={`h-1 w-full bg-gradient-to-r from-cyan-500 via-amber-500 to-red-500 ${isCritica ? "bg-red-600" : ""}`} />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground">{alerta.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {alerta.department ? `${alerta.department} · ${alerta.municipality}` : alerta.municipality}
                    <Clock className="h-3 w-3" /> {alerta.time}
                    {alerta.delegateName && <span className="truncate">· {alerta.delegateName}</span>}
                  </div>
                </div>
                <Badge className={levelColor[alerta.level] ?? "bg-zinc-700"}>{alerta.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{alerta.detail}</p>

              {alerta.photos && alerta.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {alerta.photos.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelected(alerta); setDetailOpen(true) }}
                      className="focus:outline-none"
                    >
                      <img
                        src={src}
                        alt={`Foto ${idx + 1}`}
                        className="h-20 w-28 object-cover rounded-md border border-zinc-800 hover:border-zinc-600"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-zinc-800/80 border-zinc-700">{alerta.category}</Badge>
                  <Badge className={statusColor[statusDisplay] ?? "bg-zinc-700"}>{statusDisplay}</Badge>
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-cyan-400 hover:underline"
                    onClick={() => {
                      setSelected(alerta)
                      setDetailOpen(true)
                    }}
                  >
                    Ver detalle
                  </button>
                  {alerta.category === "alerta" && (
                    <button
                      className="text-xs text-emerald-400 hover:underline"
                      onClick={() => handleStatusChange(alerta, "atendida")}
                      disabled={updating}
                    >
                      Marcar atendida
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )})}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.title}
              {selected && <Badge className={levelColor[selected.level] ?? "bg-zinc-700"}>{selected.level}</Badge>}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.department ? `${selected.department} · ${selected.municipality}` : selected?.municipality} • {selected?.time} {selected?.delegateName ? `• ${selected.delegateName}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground">
            <p className="text-muted-foreground">{selected?.detail || "Sin notas"}</p>
            {selected?.photos && selected.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selected.photos.map((src, idx) => (
                  <a
                    key={idx}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={src}
                      alt={`Foto ${idx + 1}`}
                      className="h-32 w-full object-cover rounded-md border border-border/50 hover:border-primary/60"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-zinc-800/80 border-zinc-700">{selected?.category}</Badge>
              <Badge className={statusColor[selected?.statusLabel ?? selected?.status ?? ""] ?? "bg-zinc-700"}>
                {selected?.statusLabel ?? selected?.status}
              </Badge>
            </div>
            {selected?.category === "alerta" && (
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center rounded-md bg-amber-500 px-3 py-2 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-60"
                  onClick={() => handleStatusChange(selected, "atendida")}
                  disabled={updating}
                >
                  Marcar atendida
                </button>
                <button
                  className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black hover:bg-emerald-400 disabled:opacity-60"
                  onClick={() => handleStatusChange(selected, "resuelta")}
                  disabled={updating}
                >
                  Marcar resuelta
                </button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
