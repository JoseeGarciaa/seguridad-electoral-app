"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Camera,
  Upload,
  Search,
  Filter,
  ImageIcon,
  FileText,
  Video,
  MapPin,
  Clock,
  User,
  CheckCircle,
  Eye,
  Download,
  Trash2,
  X,
  ArrowLeft,
  Home,
  ArrowRight,
  WifiOff,
  Wifi,
  ChevronRight,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

type Mesa = { id: string; label: string; municipio?: string }
type Cargo = { id: string; nombre: string }
type Partido = { id: string; nombre: string; cargoId: string }
type Candidato = { id: string; nombre: string; partidoId: string; cargoId: string }

type VoteFlowState = {
  mesaId?: string
  cargoId?: string
  partidoId?: string
  candidatoId?: string
  votos: number
  photo?: File
  photoPreview?: string
}

type EvidenceItem = {
  id: string
  type: string
  title: string
  description: string | null
  municipality: string | null
  pollingStation: string | null
  uploadedBy: string | null
  uploadedById: string | null
  uploadedAt: string
  status: string
  url: string
  tags: string[]
  voteReportId: string | null
}

type EvidenceStats = {
  total: number
  images: number
  videos: number
  documents: number
  verified: number
}

const typeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
}

const statusConfig: Record<string, { label: string; color: string }> = {
  verified: { label: "Verificado", color: "bg-emerald-500/20 text-emerald-400" },
  pending: { label: "Pendiente", color: "bg-amber-500/20 text-amber-400" },
  flagged: { label: "Marcado", color: "bg-red-500/20 text-red-400" },
}

const defaultStats: EvidenceStats = {
  total: 0,
  images: 0,
  videos: 0,
  documents: 0,
  verified: 0,
}

const steps: Array<{ key: keyof VoteFlowState | "confirm"; title: string; description: string }> = [
  { key: "mesaId", title: "Mesa", description: "Selecciona la mesa asignada" },
  { key: "cargoId", title: "Cargo", description: "Elige el cargo" },
  { key: "partidoId", title: "Partido", description: "Elige el partido" },
  { key: "candidatoId", title: "Candidato", description: "Elige el candidato" },
  { key: "votos", title: "Votos", description: "Ingresa votos con teclado tactil" },
  { key: "photo", title: "Foto E14", description: "Toma la foto del E14" },
  { key: "confirm", title: "Confirmar", description: "Revisa y envia" },
]

const chipFilters = [
  { key: "all", label: "Todos" },
  { key: "image", label: "Imagenes" },
  { key: "video", label: "Videos" },
  { key: "document", label: "Documentos" },
  { key: "verified", label: "Verificados" },
]

export default function EvidenciaPage() {
  const [view, setView] = useState<"hub" | "wizard" | "evidencias">("hub")
  const [flow, setFlow] = useState<VoteFlowState>({ votos: 0 })
  const [stepIndex, setStepIndex] = useState(0)
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [stats, setStats] = useState<EvidenceStats>(defaultStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [typeChip, setTypeChip] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isOffline, setIsOffline] = useState(!navigator?.onLine)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)

  const notify = (message: string, description?: string) => toast({ title: message, description })

  const preload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mesasRes, catalogosRes, evidencesRes] = await Promise.all([
        fetch("/api/mesas-asignadas", { cache: "no-store" }),
        fetch("/api/catalogos", { cache: "no-store" }),
        fetch("/api/evidencias", { cache: "no-store" }),
      ])

      if (!mesasRes.ok || !catalogosRes.ok || !evidencesRes.ok) {
        setError("No se pudo cargar evidencias y catalogos")
        notify("Error de carga", "Verifica conexion o API")
        return
      }

      const mesasData = await mesasRes.json()
      const catalogosData = await catalogosRes.json()
      const evidencesData = await evidencesRes.json()

      setMesas(mesasData?.items ?? [])
      setCargos(catalogosData?.cargos ?? [])
      setPartidos(catalogosData?.partidos ?? [])
      setCandidatos(catalogosData?.candidatos ?? [])
      setItems(evidencesData?.items ?? [])
      setStats(evidencesData?.stats ?? defaultStats)
    } catch (err) {
      console.error(err)
      setError("No se pudo cargar evidencias y catalogos")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    preload()
  }, [preload])

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      flushQueue()
    }
  }, [isOffline, offlineQueue])

  const flushQueue = useCallback(async () => {
    for (const item of offlineQueue) {
      await sendVote(item, false)
    }
    setOfflineQueue([])
  }, [offlineQueue])

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        (item.title ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.municipality ?? "").toLowerCase().includes(q)
      const matchesType = typeFilter === "all" || item.type === typeFilter
      const matchesStatus = statusFilter === "all" || item.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [items, searchQuery, statusFilter, typeFilter])

  const resetFlow = () => {
    setFlow({ votos: 0 })
    setStepIndex(0)
  }

  const goNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1)
  }

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))

  const stepValid = useMemo(() => {
    const current = steps[stepIndex]?.key
    if (current === "mesaId") return Boolean(flow.mesaId)
    if (current === "cargoId") return Boolean(flow.cargoId)
    if (current === "partidoId") return Boolean(flow.partidoId)
    if (current === "candidatoId") return Boolean(flow.candidatoId)
    if (current === "votos") return flow.votos >= 0
    if (current === "photo") return Boolean(flow.photo)
    return true
  }, [flow, stepIndex])

  const handlePick = (key: keyof VoteFlowState, value: string) => {
    setFlow((prev) => ({ ...prev, [key]: value }))
    goNext()
  }

  const handleVoteInput = (value: string) => {
    if (value === "clear") return setFlow((prev) => ({ ...prev, votos: 0 }))
    if (value === "plus") return setFlow((prev) => ({ ...prev, votos: prev.votos + 1 }))
    if (value === "minus") return setFlow((prev) => ({ ...prev, votos: Math.max(0, prev.votos - 1) }))
    const next = Number(`${flow.votos}${value}`)
    setFlow((prev) => ({ ...prev, votos: isNaN(next) ? prev.votos : next }))
  }

  const handlePhoto = (file?: File) => {
    if (!file) {
      setFlow((prev) => ({ ...prev, photo: undefined, photoPreview: undefined }))
      return
    }
    const preview = URL.createObjectURL(file)
    setFlow((prev) => ({ ...prev, photo: file, photoPreview: preview }))
    goNext()
  }

  const sendVote = useCallback(
    async (payload: VoteFlowState, showToast = true) => {
      try {
        const voteBody = {
          mesaId: payload.mesaId,
          cargoId: payload.cargoId,
          candidatoId: payload.candidatoId,
          votos: payload.votos,
          timestamp: Date.now(),
        }

        const voteRes = await fetch("/api/votos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(voteBody),
        })

        if (!voteRes.ok) throw new Error("Error en votos")

        if (payload.photo) {
          const formData = new FormData()
          formData.append("file", payload.photo)
          formData.append("mesaId", payload.mesaId || "")
          formData.append("cargoId", payload.cargoId || "")
          formData.append("candidatoId", payload.candidatoId || "")
          await fetch("/api/evidencias", {
            method: "POST",
            body: formData,
          })
        }

        if (showToast) notify("Registro enviado", "Se guardo la votacion y la foto")
        resetFlow()
        preload()
      } catch (err) {
        console.error(err)
        if (showToast) notify("No se pudo enviar", "Intenta de nuevo o usa modo offline")
      }
    },
    [preload]
  )
  const handleSubmit = async () => {
    if (isOffline) {
      setOfflineQueue((prev) => [...prev, flow])
      notify("Guardado en cola offline", "Se enviara al volver la conexion")
      resetFlow()
      return
    }
    await sendVote(flow)
  }

  const typeButtons = (
    <div className="flex flex-wrap gap-2">
      {chipFilters.map((chip) => (
        <Button
          key={chip.key}
          variant={typeChip === chip.key ? "default" : "outline"}
          className={`rounded-full px-4 py-2 ${typeChip === chip.key ? "bg-cyan-600 text-white" : "bg-zinc-800/60 border-zinc-700"}`}
          onClick={() => {
            setTypeChip(chip.key)
            if (chip.key === "verified") {
              setStatusFilter("verified")
              setTypeFilter("all")
              return
            }
            setStatusFilter("all")
            setTypeFilter(chip.key)
          }}
        >
          {chip.label}
        </Button>
      ))}
    </div>
  )

  const statusButtons = (
    <div className="flex flex-wrap gap-2">
      {["all", "pending", "verified", "flagged"].map((status) => (
        <Button
          key={status}
          variant={statusFilter === status ? "default" : "outline"}
          className={`rounded-full px-4 py-2 ${statusFilter === status ? "bg-emerald-600 text-white" : "bg-zinc-800/60 border-zinc-700"}`}
          onClick={() => setStatusFilter(status)}
        >
          {statusConfig[status]?.label ?? (status === "all" ? "Todos" : status)}
        </Button>
      ))}
    </div>
  )

  const wizardControls = (
    <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3">
      <Button
        variant="outline"
        className="w-24 h-14 bg-zinc-900/80 border-zinc-700 text-lg"
        onClick={stepIndex === 0 ? () => setView("hub") : goBack}
      >
        <ArrowLeft className="mr-2 h-5 w-5" /> Atras
      </Button>
      <Button
        variant="outline"
        className="w-24 h-14 bg-zinc-900/80 border-zinc-700 text-lg"
        onClick={() => setView("hub")}
      >
        <Home className="mr-2 h-5 w-5" /> Inicio
      </Button>
      <Button
        className="flex-1 h-14 bg-cyan-600 hover:bg-cyan-700 text-lg"
        disabled={!stepValid}
        onClick={stepIndex === steps.length - 1 ? handleSubmit : goNext}
      >
        {stepIndex === steps.length - 1 ? "Confirmar y enviar" : "Siguiente"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )

  const stepTitle = steps[stepIndex]

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      {isOffline && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-600/50 bg-amber-900/30 px-4 py-3 text-amber-100">
          <WifiOff className="h-5 w-5" />
          <div className="text-sm">
            Modo offline activo. Los envios se guardan en cola ({offlineQueue.length}).
          </div>
        </div>
      )}

      {view === "hub" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-zinc-900/70 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl">Centro de accion</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Button
                className="h-32 text-left flex-col items-start justify-between rounded-2xl bg-cyan-700 hover:bg-cyan-600"
                onClick={() => setView("wizard")}
              >
                <div className="flex items-center gap-3 text-lg font-semibold">
                  <Camera className="h-6 w-6" /> Registrar votos + Foto E14
                </div>
                <p className="text-base font-medium text-cyan-50/90">
                  Flujo paso a paso tactil. Sin listas desplegables.
                </p>
              </Button>

              <Button
                className="h-32 text-left flex-col items-start justify-between rounded-2xl bg-zinc-800 hover:bg-zinc-700"
                onClick={() => setView("evidencias")}
              >
                <div className="flex items-center gap-3 text-lg font-semibold">
                  <ImageIcon className="h-6 w-6" /> Ver/Descargar evidencias
                </div>
                <p className="text-base font-medium text-muted-foreground">
                  Revisa, descarga o marca verificado con gestos rapidos.
                </p>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Estado del sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {isOffline ? <WifiOff className="h-4 w-4 text-amber-400" /> : <Wifi className="h-4 w-4 text-emerald-400" />}
                <span>{isOffline ? "Offline" : "Online"}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Datos pre-cargados: mesas, cargos, partidos y candidatos. Sincroniza en segundo plano.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "wizard" && (
        <Card className="bg-zinc-900/70 border-zinc-800 relative">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Paso {stepIndex + 1} de {steps.length}</p>
                <p className="text-xl font-semibold">{stepTitle?.title}</p>
                <p className="text-sm text-muted-foreground">{stepTitle?.description}</p>
              </div>
              <Badge className="bg-zinc-800 border-zinc-700 text-xs">Tactil / Sin dropdowns</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-20">
            {stepTitle?.key === "mesaId" && (
              <MesaPicker mesas={mesas} onPick={(id) => handlePick("mesaId", id)} />
            )}
            {stepTitle?.key === "cargoId" && (
              <GridPicker
                items={cargos.map((c) => ({ id: c.id, label: c.nombre }))}
                selectedId={flow.cargoId}
                onPick={(id) => handlePick("cargoId", id)}
              />
            )}
            {stepTitle?.key === "partidoId" && (
              <GridPicker
                items={partidos
                  .filter((p) => !flow.cargoId || p.cargoId === flow.cargoId)
                  .map((p) => ({ id: p.id, label: p.nombre }))}
                selectedId={flow.partidoId}
                onPick={(id) => handlePick("partidoId", id)}
              />
            )}
            {stepTitle?.key === "candidatoId" && (
              <GridPicker
                items={candidatos
                  .filter((c) => (!flow.partidoId || c.partidoId === flow.partidoId) && (!flow.cargoId || c.cargoId === flow.cargoId))
                  .map((c) => ({ id: c.id, label: c.nombre }))}
                selectedId={flow.candidatoId}
                onPick={(id) => handlePick("candidatoId", id)}
              />
            )}
            {stepTitle?.key === "votos" && (
              <VotePad votos={flow.votos} onInput={handleVoteInput} />
            )}
            {stepTitle?.key === "photo" && (
              <PhotoStep flow={flow} onPhoto={handlePhoto} />
            )}
            {stepTitle?.key === "confirm" && (
              <ConfirmStep flow={flow} onSubmit={handleSubmit} />
            )}
          </CardContent>
          {wizardControls}
        </Card>
      )}

      {view === "evidencias" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <StatCard icon={<Camera className="h-5 w-5 text-cyan-400" />} label="Total" value={stats.total} />
            <StatCard icon={<ImageIcon className="h-5 w-5 text-emerald-400" />} label="Imagenes" value={stats.images} />
            <StatCard icon={<Video className="h-5 w-5 text-purple-400" />} label="Videos" value={stats.videos} />
            <StatCard icon={<FileText className="h-5 w-5 text-amber-400" />} label="Documentos" value={stats.documents} />
            <StatCard icon={<CheckCircle className="h-5 w-5 text-emerald-400" />} label="Verificados" value={stats.verified} />
          </div>

          <Card className="bg-zinc-900/70 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filtros
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-zinc-800/60 border-zinc-700"
                    onClick={() => notify("Descarga iniciada")}
                  >
                    <Download className="h-4 w-4 mr-2" /> Descargar
                  </Button>
                  <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Upload className="h-4 w-4 mr-2" /> Subir evidencia
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-zinc-800">
                      <DialogHeader>
                        <DialogTitle>Subir evidencia rapida</DialogTitle>
                      </DialogHeader>
                      <QuickUpload onDone={preload} />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mesa, municipio, titulo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800/50 border-zinc-700 h-12"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Tipo</p>
                {typeButtons}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Estado</p>
                {statusButtons}
              </div>
            </CardContent>
          </Card>

          {loading && (
            <Card className="bg-zinc-900/70 border-zinc-800">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Cargando evidencias...
              </CardContent>
            </Card>
          )}

          {error && !loading && (
            <Card className="bg-zinc-900/70 border-red-900/60 border">
              <CardContent className="p-6 text-sm text-red-300 flex flex-col gap-3">
                {error}
                <Button className="bg-red-700" onClick={preload}>Reintentar</Button>
              </CardContent>
            </Card>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <EvidenceCard key={item.id} item={item} onVerify={() => notify("Marcado verificado")}></EvidenceCard>
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <Card className="bg-zinc-900/70 border-zinc-800">
              <CardContent className="p-12 text-center">
                <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Sin resultados</h3>
                <p className="text-muted-foreground mb-4">Ajusta los filtros o reinicia la busqueda</p>
                <Button variant="outline" className="bg-zinc-800/70" onClick={() => { setSearchQuery(""); setTypeFilter("all"); setStatusFilter("all") }}>Reset filtros</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">{icon}</div>
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GridPicker({
  items,
  selectedId,
  onPick,
}: {
  items: Array<{ id: string; label: string }>
  selectedId?: string
  onPick: (id: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isActive = selectedId === item.id
        return (
          <button
            key={item.id}
            onClick={() => onPick(item.id)}
            className={`flex h-20 items-center justify-between rounded-2xl border px-4 text-left text-lg font-semibold transition ${
              isActive ? "border-cyan-500 bg-cyan-500/15 text-white" : "border-zinc-700 bg-zinc-800/60 text-foreground"
            }`}
          >
            <span>{item.label}</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}

function MesaPicker({ mesas, onPick }: { mesas: Mesa[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return mesas.filter((m) => m.label.toLowerCase().includes(q) || (m.municipio ?? "").toLowerCase().includes(q))
  }, [mesas, query])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Buscar mesa por numero"
          className="bg-zinc-800/60 border-zinc-700 h-12"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="outline" className="h-12 bg-zinc-800/60 border-zinc-700" onClick={() => setQuery("")}>Limpiar</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mesa) => (
          <button
            key={mesa.id}
            onClick={() => onPick(mesa.id)}
            className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4 text-left text-lg font-semibold hover:border-cyan-500"
          >
            <div className="flex items-center justify-between">
              <span>Mesa {mesa.label}</span>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{mesa.municipio}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function VotePad({ votos, onInput }: { votos: number; onInput: (val: string) => void }) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6">
        <p className="text-sm text-muted-foreground">Votos ingresados</p>
        <p className="text-5xl font-bold">{votos}</p>
      </div>
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4 grid grid-cols-3 gap-3">
        {digits.map((d) => (
          <Button key={d} className="h-16 text-2xl" onClick={() => onInput(d)}>
            {d}
          </Button>
        ))}
        <Button variant="outline" className="h-16" onClick={() => onInput("plus")}>+1</Button>
        <Button variant="outline" className="h-16" onClick={() => onInput("minus")}>-1</Button>
        <Button variant="destructive" className="h-16" onClick={() => onInput("clear")}>Limpiar</Button>
      </div>
    </div>
  )
}

function PhotoStep({ flow, onPhoto }: { flow: VoteFlowState; onPhoto: (f?: File) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-6 text-center">
        {flow.photoPreview ? (
          <img src={flow.photoPreview} alt="E14" className="mx-auto h-72 w-full max-w-md rounded-xl object-cover" />
        ) : (
          <div className="mx-auto flex h-72 max-w-md items-center justify-center rounded-xl border border-dashed border-zinc-600 bg-zinc-900/70">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 cursor-pointer rounded-xl border border-cyan-600 bg-cyan-600/20 px-4 py-3 text-center text-lg font-semibold hover:bg-cyan-600/30">
          Abrir camara / subir foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </label>
        <Button variant="outline" className="h-12" onClick={() => onPhoto(undefined)}>
          Repetir foto
        </Button>
      </div>
    </div>
  )
}

function ConfirmStep({ flow, onSubmit }: { flow: VoteFlowState; onSubmit: () => void }) {
  const rows = [
    { label: "Mesa", value: flow.mesaId },
    { label: "Cargo", value: flow.cargoId },
    { label: "Partido", value: flow.partidoId },
    { label: "Candidato", value: flow.candidatoId },
    { label: "Votos", value: flow.votos },
  ]
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-zinc-800 py-3 last:border-b-0">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-lg font-semibold">{r.value ?? "-"}</span>
          </div>
        ))}
      </div>
      <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-lg" onClick={onSubmit}>
        Enviar ahora
      </Button>
    </div>
  )
}

function EvidenceCard({ item, onVerify }: { item: EvidenceItem; onVerify: () => void }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-zinc-800 border-zinc-700">
              {typeIcons[item.type] ?? <FileText className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-semibold text-foreground leading-tight">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.municipality ?? ""}</p>
            </div>
          </div>
          <Badge className={statusConfig[item.status]?.color ?? "bg-zinc-700/50"}>
            {statusConfig[item.status]?.label ?? item.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.pollingStation && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.pollingStation}</span>
          )}
          {item.uploadedBy && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.uploadedBy}</span>
          )}
          {item.uploadedAt && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(item.uploadedAt).toLocaleString()}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={`${item.id}-${tag}`} variant="outline" className="bg-zinc-800/50 border-zinc-700 text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            className="bg-zinc-800/60 border-zinc-700"
            onClick={() => window.open(item.url, "_blank")}
          >
            <Eye className="h-4 w-4 mr-2" /> Ver
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-emerald-600/30 border-emerald-700 text-emerald-100"
              onClick={onVerify}
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Marcar verificado
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open(item.url, "_blank")}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400"
              onClick={() => toast({ title: "Eliminar pendiente" })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickUpload({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    municipality: "",
    pollingStation: "",
    type: "image",
    status: "pending",
    url: "",
    tags: "",
  })
  const notify = (message: string, description?: string) => toast({ title: message, description })

  const handleCreate = async () => {
    if (!form.title || !form.url) {
      notify("Falta informacion", "Titulo y URL son obligatorios")
      return
    }
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        municipality: form.municipality || null,
        pollingStation: form.pollingStation || null,
        type: form.type,
        status: form.status,
        url: form.url,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }
      const res = await fetch("/api/evidencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Error")
      notify("Evidencia registrada")
      onDone()
    } catch (err) {
      console.error(err)
      notify("No se pudo guardar", "Intentalo de nuevo")
    }
  }

  return (
    <div className="space-y-3 py-2">
      <Input
        placeholder="Titulo"
        className="bg-zinc-800/50 border-zinc-700"
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
      />
      <Textarea
        placeholder="Descripcion"
        className="bg-zinc-800/50 border-zinc-700"
        rows={3}
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          placeholder="Municipio"
          className="bg-zinc-800/50 border-zinc-700"
          value={form.municipality}
          onChange={(e) => setForm((prev) => ({ ...prev, municipality: e.target.value }))}
        />
        <Input
          placeholder="Mesa / Puesto"
          className="bg-zinc-800/50 border-zinc-700"
          value={form.pollingStation}
          onChange={(e) => setForm((prev) => ({ ...prev, pollingStation: e.target.value }))}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {["image", "video", "document"].map((type) => (
          <Button
            key={type}
            variant={form.type === type ? "default" : "outline"}
            className={`rounded-full ${form.type === type ? "bg-cyan-600" : "bg-zinc-800/60 border-zinc-700"}`}
            onClick={() => setForm((prev) => ({ ...prev, type }))}
          >
            {type}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["pending", "verified", "flagged"].map((status) => (
          <Button
            key={status}
            variant={form.status === status ? "default" : "outline"}
            className={`rounded-full ${form.status === status ? "bg-emerald-600" : "bg-zinc-800/60 border-zinc-700"}`}
            onClick={() => setForm((prev) => ({ ...prev, status }))}
          >
            {statusConfig[status]?.label ?? status}
          </Button>
        ))}
      </div>
      <Input
        placeholder="URL o nombre de archivo"
        className="bg-zinc-800/50 border-zinc-700"
        value={form.url}
        onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
      />
      <Input
        placeholder="Tags separados por coma"
        className="bg-zinc-800/50 border-zinc-700"
        value={form.tags}
        onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
      />
      <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={handleCreate}>
        <Upload className="h-4 w-4 mr-2" /> Subir
      </Button>
    </div>
  )
}
