"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  FileImage,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Table,
  X,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Step = "home" | "votos" | "foto" | "confirm" | "done"

type Candidate = {
  id: string
  fullName: string
  ballotNumber: number | null
  position: string | null
  party: string | null
  color: string | null
  region: string | null
}

type PhotoItem = { file: File; preview: string }

interface Mesa {
  id: string
  label: string
  municipality?: string | null
  totalVoters?: number | null
}

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern)
  }
}

const localKey = (mesaId: string) => `testigo-draft-${mesaId}`

interface CompletedMesa {
  id: string
  label: string
  totalVotos: number
  note: string
}

export default function TestigoElectoralPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [mesaIndex, setMesaIndex] = useState(0)
  const [step, setStep] = useState<Step>("home")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle")
  const [focusedCandidate, setFocusedCandidate] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [draftVotes, setDraftVotes] = useState<Record<string, number>>({})
  const [note, setNote] = useState("")
  const [completedMesas, setCompletedMesas] = useState<CompletedMesa[]>([])
  const [reportsMap, setReportsMap] = useState<Record<string, { id: string; total: number }>>({})
  const keypadRef = useRef<HTMLDivElement | null>(null)

  const maxPhotos = 4

  const currentMesa = mesas[mesaIndex]
  const mesasTotal = mesas.length
  const mesaProgress = mesasTotal ? mesaIndex + 1 : 0

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [mesasRes, catalogosRes] = await Promise.all([
          fetch("/api/mesas-asignadas"),
          fetch("/api/catalogos"),
        ])

        if (!mesasRes.ok) {
          throw new Error("No pudimos cargar tus mesas asignadas")
        }
        if (!catalogosRes.ok) {
          throw new Error("No pudimos cargar la lista de candidatos")
        }

        const mesasJson = await mesasRes.json().catch(() => ({ items: [] }))
        const catalogosJson = await catalogosRes.json().catch(() => ({ candidatos: [] }))

        if (cancelled) return

        const mappedMesas: Mesa[] = Array.isArray(mesasJson.items)
          ? mesasJson.items.map((item: any) => ({
              id: String(item.id),
              label: item.label ?? "Mesa asignada",
              municipality: item.municipio ?? item.municipality ?? null,
              totalVoters: item.total_voters ?? null,
            }))
          : []

        const mappedCandidates: Candidate[] = Array.isArray(catalogosJson.candidatos)
          ? catalogosJson.candidatos.map((c: any) => ({
              id: String(c.id),
              fullName: c.full_name ?? c.nombre ?? "Candidato",
              ballotNumber: typeof c.ballot_number === "number" ? c.ballot_number : null,
              position: c.position ?? c.cargo ?? null,
              party: c.party ?? c.partido ?? null,
              color: c.color ?? null,
              region: c.region ?? null,
            }))
          : []

        setMesas(mappedMesas)
        setCandidates(mappedCandidates)
        setMesaIndex(0)
        setStep("home")
        setFocusedCandidate(mappedCandidates[0]?.id ?? null)
        // Reset completados mientras llega el estado real
        setCompletedMesas([])
        setReportsMap({})
      } catch (err: any) {
        if (cancelled) return
        const message = err?.message ?? "Error al cargar datos"
        setError(message)
        toast({ title: "Error", description: message })
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchReports = async () => {
      if (mesas.length === 0) return
      try {
        const res = await fetch("/api/my/vote-report")
        if (!res.ok) throw new Error("No pudimos cargar tus reportes enviados")
        const json = await res.json()
        if (cancelled) return
        const map: Record<string, { id: string; total: number }> = {}
        if (Array.isArray(json.items)) {
          json.items.forEach((item: any) => {
            map[String(item.delegate_assignment_id)] = {
              id: String(item.id),
              total: Number(item.total_votes) || 0,
            }
          })
        }
        setReportsMap(map)
        const completed = mesas
          .filter((m) => map[m.id])
          .map((m) => ({ id: m.id, label: m.label, totalVotos: map[m.id].total, note: "" }))
        setCompletedMesas(completed)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message ?? "Error cargando reportes")
      }
    }

    fetchReports()
    return () => {
      cancelled = true
    }
  }, [mesas])

  useEffect(() => {
    if (!currentMesa || candidates.length === 0) return

    const stored = localStorage.getItem(localKey(currentMesa.id))
    if (stored) {
      const parsed = JSON.parse(stored)
      setDraftVotes(parsed.votes || {})
      setNote(parsed.note || "")
    } else {
      const zeros: Record<string, number> = {}
      candidates.forEach((c) => {
        zeros[c.id] = 0
      })
      setDraftVotes(zeros)
      setNote("")
    }
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview))
      return []
    })
    setFocusedCandidate(candidates[0]?.id || null)
  }, [mesaIndex, currentMesa?.id, candidates])

  useEffect(() => {
    if (!currentMesa) return
    localStorage.setItem(localKey(currentMesa.id), JSON.stringify({
      votes: draftVotes,
      note,
    }))
  }, [draftVotes, note, currentMesa?.id])

  const totalVotos = useMemo(
    () => Object.values(draftVotes).reduce((acc, n) => acc + (isNaN(n) ? 0 : n), 0),
    [draftVotes]
  )

  const mesaCapacity = currentMesa?.totalVoters ?? null
  const warningOver = mesaCapacity !== null && totalVotos > mesaCapacity

  const handleKeypad = (value: string) => {
    if (!focusedCandidate) return
    vibrate(10)
    setDraftVotes((prev) => {
      const current = prev[focusedCandidate] ?? 0
      if (value === "back") {
        const truncated = Math.floor(current / 10)
        return { ...prev, [focusedCandidate]: truncated }
      }
      if (value === "clear") {
        return { ...prev, [focusedCandidate]: 0 }
      }
      const next = Number(`${current}${value}`)
      return { ...prev, [focusedCandidate]: Math.min(next, 9999) }
    })
  }

  const increment = (id: string) => {
    vibrate(5)
    setDraftVotes((prev) => ({ ...prev, [id]: Math.min((prev[id] || 0) + 1, 9999) }))
    setFocusedCandidate(id)
  }

  const decrement = (id: string) => {
    vibrate(5)
    setDraftVotes((prev) => ({ ...prev, [id]: Math.max((prev[id] || 0) - 1, 0) }))
    setFocusedCandidate(id)
  }

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview))
      return []
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev]
      const removed = next.splice(index, 1)[0]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const validFiles = files.filter((file) => file.type.startsWith("image/"))
    if (validFiles.length !== files.length) {
      toast({ title: "Formato no permitido", description: "Solo fotos del E14." })
    }

    setPhotos((prev) => {
      const remaining = maxPhotos - prev.length
      if (remaining <= 0) {
        toast({ title: "Límite de fotos", description: `Máximo ${maxPhotos} imágenes por mesa.` })
        return prev
      }
      const toAdd = validFiles.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      if (validFiles.length > remaining) {
        toast({ title: "Límite de fotos", description: `Solo puedes subir ${maxPhotos} imágenes.` })
      }
      return [...prev, ...toAdd]
    })

    event.currentTarget.value = ""
    vibrate(15)
  }

  const goToPhoto = () => {
    setStep("foto")
    vibrate(15)
  }

  const goToConfirm = () => {
    if (photos.length === 0) {
      toast({ title: "Falta foto E14", description: "No puedes continuar sin al menos 1 foto." })
      vibrate([30, 40, 30])
      return
    }
    setStep("confirm")
  }

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"))
    reader.readAsDataURL(file)
  })

  const handleConfirm = async () => {
    if (!currentMesa) return
    setSavingState("saving")
    vibrate(20)
    try {
      if (photos.length === 0) {
        throw new Error("Debes subir al menos una foto del E14")
      }
      if (photos.length > maxPhotos) {
        throw new Error(`Solo se permiten ${maxPhotos} fotos por mesa`)
      }

      const photoPayloads = await Promise.all(photos.map((p) => fileToDataUrl(p.file)))

      const payload = {
        delegate_assignment_id: currentMesa.id,
        divipole_location_id: null,
        notes: note || null,
        details: candidates.map((c) => ({ candidate_id: c.id, votes: draftVotes[c.id] ?? 0 })),
        photos: photoPayloads,
      }

      const res = await fetch("/api/my/vote-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        const message = json?.error ?? "No se pudo guardar la mesa"
        throw new Error(message)
      }

      const json = await res.json()
      const reportId = json.report_id as string | null
      setSavingState("saved")
      toast({ title: "Mesa guardada correctamente", description: currentMesa.label })
      setReportsMap((prev) => ({ ...prev, [currentMesa.id]: { id: reportId ?? currentMesa.id, total: totalVotos } }))
      setCompletedMesas((prev) => {
        const filtered = prev.filter((m) => m.id !== currentMesa.id)
        return [...filtered, { id: currentMesa.id, label: currentMesa.label, totalVotos, note }]
      })
      setStep("done")
    } catch (err: any) {
      const message = err?.message ?? "Error al guardar"
      setSavingState("idle")
      toast({ title: "Error", description: message })
    }
  }

  const goNextMesa = () => {
    if (mesaIndex < mesasTotal - 1) {
      setMesaIndex((prev) => prev + 1)
      setSavingState("idle")
      clearPhotos()
      setStep("votos")
    }
  }

  const cancelCurrentMesa = () => {
    if (!currentMesa) return
    vibrate([10, 20])
    const zeros: Record<string, number> = {}
    candidates.forEach((c) => {
      zeros[c.id] = 0
    })
    setDraftVotes(zeros)
    setNote("")
    clearPhotos()
    setStep("home")
    localStorage.removeItem(localKey(currentMesa.id))
    toast({ title: "Registro cancelado", description: `${currentMesa.label} reiniciada` })
  }

  const editMesa = (mesaId: string) => {
    const index = mesas.findIndex((m) => m.id === mesaId)
    if (index >= 0) {
      setMesaIndex(index)
      setStep("votos")
    }
  }

  const nextPendingMesaIndex = useMemo(() => {
    const completedIds = new Set(completedMesas.map((m) => m.id))
    const idx = mesas.findIndex((m) => !completedIds.has(m.id))
    return idx === -1 ? 0 : idx
  }, [completedMesas, mesas])

  const openMesa = (index: number) => {
    setMesaIndex(index)
    setStep("votos")
  }

  const keypadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"]

  const statusLabel = step === "done" ? "Confirmado" : savingState === "saving" ? "Enviando" : "Guardado"
  const statusColor = step === "done" ? "text-emerald-400" : savingState === "saving" ? "text-amber-300" : "text-muted-foreground"
  const completedCount = completedMesas.length
  const pendingCount = Math.max(mesasTotal - completedCount, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-black/40 text-foreground flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando tu puesto y candidatos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Preparando tu vista personal de testigo electoral.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentMesa) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-black/40 text-foreground flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-border/60 text-center space-y-3">
          <CardHeader>
            <CardTitle className="text-lg">No tienes mesas asignadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Revisa con tu líder para asignarte un puesto. Aquí solo verás tus propias mesas.</p>
            <Button onClick={() => window.location.reload()} className="w-full">Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-black/40 text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Puesto asignado
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">{currentMesa.label}</Badge>
              {currentMesa.municipality && (
                <Badge variant="outline" className="text-xs px-2 py-1">{currentMesa.municipality}</Badge>
              )}
              <span className="text-xs text-muted-foreground">Mesa {mesaProgress} de {mesasTotal}</span>
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium">{statusLabel}</span>
              <span className={statusColor}>{step === "done" ? "✔️ E14 cargado" : photos.length > 0 ? "E14 listo" : "E14 pendiente"}</span>
              <span className="text-muted-foreground">Solo ves tus mesas asignadas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <Badge variant="outline" className="text-xs">Perfil Testigo</Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4 max-w-2xl mx-auto">
        <Card className="bg-card/80 border-border/60 shadow-md">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Mesas subidas</p>
                <p className="text-2xl font-bold text-emerald-400">{completedCount}/{mesasTotal}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Faltantes</p>
                <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Table className="h-4 w-4" />
              Selecciona la mesa, escoge el candidato y reporta los votos del E14.
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-border/60 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Resumen inicial */}
        {step === "home" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mesas asignadas</CardTitle>
              <p className="text-sm text-muted-foreground">Solo ves tu propio puesto y mesas. Retoma la pendiente o abre una nueva.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {mesas.map((m, idx) => {
                  const completed = completedMesas.find((c) => c.id === m.id)
                  const isPending = !completed
                  const statusLabel = completed ? "Completada" : "Pendiente"
                  const statusTone = completed ? "text-emerald-400" : "text-amber-300"
                  return (
                    <div key={m.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.municipality ?? "Puesto asignado"}</p>
                        <p className={`text-xs ${statusTone}`}>{statusLabel}</p>
                      </div>
                      <Button size="sm" className="min-w-[120px]" onClick={() => openMesa(idx)}>
                        {isPending ? "Abrir" : "Editar"}
                      </Button>
                    </div>
                  )
                })}
              </div>
              <Button
                size="lg"
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openMesa(nextPendingMesaIndex)}
              >
                Reanudar {mesas[nextPendingMesaIndex]?.label}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Paso 1: Votos */}
        {step === "votos" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Paso 1 · Votos por candidato
              </CardTitle>
              <p className="text-sm text-muted-foreground">Registra rápido. Sin scroll, un valor por candidato.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecciona la mesa que vas a reportar</p>
                <Select value={currentMesa.id} onValueChange={(value) => {
                  const idx = mesas.findIndex((m) => m.id === value)
                  if (idx >= 0) {
                    setMesaIndex(idx)
                    setStep("votos")
                  }
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mesa asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  Solo puedes ver y reportar tus mesas asignadas.
                </div>
              </div>

              {candidates.map((candidate) => {
                const value = draftVotes[candidate.id] ?? 0
                const isFocused = focusedCandidate === candidate.id
                return (
                  <div
                    key={candidate.id}
                    className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 ${isFocused ? "ring-2 ring-emerald-500/80" : ""}`}
                    onClick={() => setFocusedCandidate(candidate.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {candidate.color && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: candidate.color }} />}
                        <p className="text-sm font-semibold leading-tight truncate">{candidate.fullName}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {candidate.position ? `${candidate.position} · ` : ""}{candidate.party ?? "Independiente"}
                        {candidate.ballotNumber !== null ? ` · Tarjetón ${candidate.ballotNumber}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-12 w-12" onClick={() => decrement(candidate.id)} aria-label="Restar">
                        <Minus className="h-5 w-5" />
                      </Button>
                      <div className="min-w-[88px] text-center">
                        <div className="text-3xl font-bold tracking-tight">{value}</div>
                        <p className="text-[10px] text-muted-foreground">votos</p>
                      </div>
                      <Button size="icon" variant="outline" className="h-12 w-12" onClick={() => increment(candidate.id)} aria-label="Sumar">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {candidates.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  No hay candidatos cargados desde el sistema. Consulta con soporte.
                </div>
              )}

              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Total reportado</p>
                  <p className={`text-xl font-bold ${warningOver ? "text-amber-300" : "text-emerald-300"}`}>{totalVotos} votos</p>
                  <p className="text-xs text-muted-foreground">Capacidad mesa: {mesaCapacity ?? "No disponible"}</p>
                </div>
                {warningOver && mesaCapacity !== null && <span className="text-xs text-amber-300">Supera total de votantes</span>}
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3">
                <p className="text-sm font-semibold mb-2">Keypad rápido</p>
                <div ref={keypadRef} className="grid grid-cols-3 gap-2">
                  {keypadButtons.map((key) => (
                    <Button
                      key={key}
                      variant={key === "clear" || key === "back" ? "outline" : "default"}
                      className="h-14 text-xl"
                      onClick={() => handleKeypad(key)}
                    >
                      {key === "back" ? "⌫" : key === "clear" ? "C" : key}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={goToPhoto}
                >
                  Continuar a foto del E14 <ChevronRight className="h-5 w-5" />
                </Button>
                <Button disabled variant="outline" className="h-12 text-sm">Copiar valores anteriores (bloqueado)</Button>
                <Button variant="destructive" className="h-12 text-sm" onClick={cancelCurrentMesa}>
                  Cancelar registro de esta mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 2: Foto */}
        {step === "foto" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Paso 2 · Foto E14 (obligatorio)
              </CardTitle>
              <p className="text-sm text-muted-foreground">Sube entre 1 y {maxPhotos} fotos del E14.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-4 flex flex-col items-center gap-3 text-center">
                {photos.length > 0 ? (
                  <div className="w-full grid gap-2 sm:grid-cols-2">
                    {photos.map((photo, idx) => (
                      <div key={`${photo.preview}-${idx}`} className="relative rounded-xl overflow-hidden border border-border/60 bg-black/40">
                        <img src={photo.preview} alt={`E14 ${idx + 1}`} className="w-full object-contain" />
                        <button
                          type="button"
                          className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1"
                          onClick={() => removePhoto(idx)}
                          aria-label="Eliminar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-full bg-muted/30">
                    <FileImage className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <p className="text-sm font-semibold">Sube fotos del E14 ({photos.length}/{maxPhotos})</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhoto}
                  className="w-full rounded-lg border border-border/60 bg-background/80 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white"
                />
                <div className="flex w-full gap-2">
                  <Button variant="outline" className="flex-1 h-12" onClick={clearPhotos} disabled={photos.length === 0}>
                    Limpiar fotos
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    onClick={goToConfirm}
                    disabled={photos.length === 0}
                  >
                    Confirmar foto <CheckCircle2 className="h-5 w-5 ml-2" />
                  </Button>
                </div>
                <Button variant="destructive" className="w-full h-12 text-sm" onClick={cancelCurrentMesa}>
                  Cancelar registro de esta mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 3: Confirmación */}
        {step === "confirm" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleCheck className="h-5 w-5" />
                Paso 3 · Confirmar y guardar
              </CardTitle>
              <p className="text-sm text-muted-foreground">Revisa mesa, totales y foto antes de enviar.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mesa</span>
                  <span className="font-semibold">{currentMesa.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total votos</span>
                  <span className="font-semibold">{totalVotos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Foto E14</span>
                  <span className="font-semibold text-emerald-400">{photos.length} cargadas</span>
                </div>
                <Separator className="my-2" />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nota rápida (hallazgos, incidencias)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background/70 p-3 text-sm focus:outline-none"
                    rows={2}
                    placeholder="Ej: Votante sin cédula reportado, jurado cambió a las 2pm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-background/60 rounded-lg px-3 py-2">
                      <span className="truncate mr-2">{c.fullName}</span>
                      <span className="font-semibold">{draftVotes[c.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="h-14 text-lg bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  onClick={handleConfirm}
                  disabled={savingState === "saving"}
                >
                  {savingState === "saving" && <Loader2 className="h-5 w-5 animate-spin" />}Confirmar y guardar
                </Button>
                <Button size="lg" variant="outline" className="h-12" onClick={() => setStep("votos")}>Editar</Button>
                <Button variant="destructive" className="h-12 text-sm" onClick={cancelCurrentMesa}>
                  Cancelar registro de esta mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paso 4: Siguiente mesa */}
        {step === "done" && (
          <Card className="bg-card border-border/60 shadow-lg text-center">
            <CardHeader>
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <CardTitle className="text-xl">{currentMesa.label} registrada</CardTitle>
                <p className="text-sm text-muted-foreground">E14 cargado y votos enviados.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">Tiempo óptimo: 1.5s a siguiente</Badge>
              <Button
                size="lg"
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={goNextMesa}
                disabled={mesaIndex >= mesasTotal - 1}
              >
                Ir a {mesaIndex < mesasTotal - 1 ? mesas[mesaIndex + 1].label : "fin"}
              </Button>
              {mesaIndex >= mesasTotal - 1 && (
                <p className="text-sm text-muted-foreground">No hay más mesas asignadas.</p>
              )}
              <div className="text-left space-y-2 pt-2">
                <p className="text-sm font-semibold">Mesas completadas</p>
                {completedMesas.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aún no hay mesas confirmadas.</p>
                )}
                <div className="space-y-2">
                  {completedMesas.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.label}</p>
                        <p className="text-xs text-muted-foreground">Votos: {m.totalVotos}</p>
                        {m.note && <p className="text-xs text-muted-foreground truncate">Nota: {m.note}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => editMesa(m.id)}>Editar</Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
