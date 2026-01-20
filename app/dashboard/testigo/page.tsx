"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  FileImage,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
} from "lucide-react"

type Step = "home" | "votos" | "foto" | "confirm" | "done"

interface Candidate {
  id: string
  name: string
}

interface Mesa {
  id: string
  label: string
  puesto: string
  totalVoters: number
  candidates: Candidate[]
}

const assignedMesas: Mesa[] = [
  {
    id: "mesa-023",
    label: "Mesa 023",
    puesto: "Colegio Distrital Las Flores",
    totalVoters: 320,
    candidates: [
      { id: "cand-1", name: "Alcaldía - Equipo Unido" },
      { id: "cand-2", name: "Concejo - Lista 1" },
      { id: "cand-3", name: "Concejo - Lista 2" },
      { id: "cand-4", name: "Gobernación - Aliado" },
    ],
  },
  {
    id: "mesa-024",
    label: "Mesa 024",
    puesto: "Colegio Distrital Las Flores",
    totalVoters: 305,
    candidates: [
      { id: "cand-1", name: "Alcaldía - Equipo Unido" },
      { id: "cand-2", name: "Concejo - Lista 1" },
      { id: "cand-3", name: "Concejo - Lista 2" },
      { id: "cand-4", name: "Gobernación - Aliado" },
    ],
  },
  {
    id: "mesa-045",
    label: "Mesa 045",
    puesto: "IED Barrio Abajo",
    totalVoters: 298,
    candidates: [
      { id: "cand-1", name: "Alcaldía - Equipo Unido" },
      { id: "cand-2", name: "Concejo - Lista 1" },
      { id: "cand-3", name: "Concejo - Lista 2" },
      { id: "cand-4", name: "Gobernación - Aliado" },
    ],
  },
]

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
  const [mesaIndex, setMesaIndex] = useState(0)
  const [step, setStep] = useState<Step>("votos")
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle")
  const [focusedCandidate, setFocusedCandidate] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [draftVotes, setDraftVotes] = useState<Record<string, number>>({})
  const [note, setNote] = useState("")
  const [completedMesas, setCompletedMesas] = useState<CompletedMesa[]>([])
  const keypadRef = useRef<HTMLDivElement | null>(null)

  const currentMesa = assignedMesas[mesaIndex]
  const mesasTotal = assignedMesas.length
  const mesaProgress = mesaIndex + 1

  useEffect(() => {
    const stored = localStorage.getItem(localKey(currentMesa.id))
    if (stored) {
      const parsed = JSON.parse(stored)
      setDraftVotes(parsed.votes || {})
      setPhotoPreview(parsed.photoPreview || null)
      setNote(parsed.note || "")
    } else {
      const zeros: Record<string, number> = {}
      currentMesa.candidates.forEach((c) => {
        zeros[c.id] = 0
      })
      setDraftVotes(zeros)
      setPhotoPreview(null)
      setNote("")
    }
    setPhotoFile(null)
    setStep("votos")
    setFocusedCandidate(currentMesa.candidates[0]?.id || null)
  }, [mesaIndex, currentMesa.id, currentMesa.candidates])

  useEffect(() => {
    localStorage.setItem(localKey(currentMesa.id), JSON.stringify({
      votes: draftVotes,
      photoPreview,
      note,
    }))
  }, [draftVotes, photoPreview, note, currentMesa.id])

  const totalVotos = useMemo(
    () => Object.values(draftVotes).reduce((acc, n) => acc + (isNaN(n) ? 0 : n), 0),
    [draftVotes]
  )

  const warningOver = totalVotos > currentMesa.totalVoters

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

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato no permitido", description: "Solo fotos del E14." })
      return
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    const preview = URL.createObjectURL(file)
    setPhotoFile(file)
    setPhotoPreview(preview)
    vibrate(15)
  }

  const goToPhoto = () => {
    setStep("foto")
    vibrate(15)
  }

  const goToConfirm = () => {
    if (!photoPreview) {
      toast({ title: "Falta foto E14", description: "No puedes continuar sin foto." })
      vibrate([30, 40, 30])
      return
    }
    setStep("confirm")
  }

  const handleConfirm = async () => {
    setSavingState("saving")
    vibrate(20)
    await new Promise((res) => setTimeout(res, 500))
    setSavingState("saved")
    toast({ title: "Mesa guardada correctamente", description: currentMesa.label })
    setCompletedMesas((prev) => {
      const filtered = prev.filter((m) => m.id !== currentMesa.id)
      return [...filtered, { id: currentMesa.id, label: currentMesa.label, totalVotos, note }]
    })
    setStep("done")
  }

  const goNextMesa = () => {
    if (mesaIndex < mesasTotal - 1) {
      setMesaIndex((prev) => prev + 1)
      setSavingState("idle")
      setPhotoFile(null)
      setPhotoPreview(null)
      setStep("votos")
    }
  }

  const cancelCurrentMesa = () => {
    vibrate([10, 20])
    const zeros: Record<string, number> = {}
    currentMesa.candidates.forEach((c) => {
      zeros[c.id] = 0
    })
    setDraftVotes(zeros)
    setNote("")
    setPhotoFile(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    setStep("home")
    localStorage.removeItem(localKey(currentMesa.id))
    toast({ title: "Registro cancelado", description: `${currentMesa.label} reiniciada` })
  }

  const editMesa = (mesaId: string) => {
    const index = assignedMesas.findIndex((m) => m.id === mesaId)
    if (index >= 0) {
      setMesaIndex(index)
      setStep("votos")
    }
  }

  const nextPendingMesaIndex = useMemo(() => {
    const completedIds = new Set(completedMesas.map((m) => m.id))
    const idx = assignedMesas.findIndex((m) => !completedIds.has(m.id))
    return idx === -1 ? 0 : idx
  }, [completedMesas])

  const openMesa = (index: number) => {
    setMesaIndex(index)
    setStep("votos")
  }

  const keypadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"]

  const statusLabel = step === "done" ? "Confirmado" : savingState === "saving" ? "Enviando" : "Guardado"
  const statusColor = step === "done" ? "text-emerald-400" : savingState === "saving" ? "text-amber-300" : "text-muted-foreground"

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-black/40 text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{currentMesa.puesto}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">{currentMesa.label}</Badge>
              <span className="text-xs text-muted-foreground">Mesa {mesaProgress} de {mesasTotal} asignadas</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium">{statusLabel}</span>
              <span className={statusColor}>{step === "done" ? "✔️ E14 cargado" : photoPreview ? "E14 listo" : "E14 pendiente"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <Badge variant="outline" className="text-xs">Modo Testigo</Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4 max-w-2xl mx-auto">
        {/* Resumen inicial */}
        {step === "home" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mesas asignadas</CardTitle>
              <p className="text-sm text-muted-foreground">Reanuda o abre la siguiente mesa pendiente.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {assignedMesas.map((m, idx) => {
                  const completed = completedMesas.find((c) => c.id === m.id)
                  const isPending = !completed
                  const statusLabel = completed ? "Completada" : "Pendiente"
                  const statusTone = completed ? "text-emerald-400" : "text-amber-300"
                  return (
                    <div key={m.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.puesto}</p>
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
                Reanudar {assignedMesas[nextPendingMesaIndex]?.label}
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
              {currentMesa.candidates.map((candidate) => {
                const value = draftVotes[candidate.id] ?? 0
                const isFocused = focusedCandidate === candidate.id
                return (
                  <div
                    key={candidate.id}
                    className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 ${isFocused ? "ring-2 ring-emerald-500/80" : ""}`}
                    onClick={() => setFocusedCandidate(candidate.id)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold leading-tight">{candidate.name}</p>
                      <p className="text-[11px] text-muted-foreground">Toque para enfocar y usar keypad</p>
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

              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Total reportado</p>
                  <p className={`text-xl font-bold ${warningOver ? "text-amber-300" : "text-emerald-300"}`}>{totalVotos} votos</p>
                  <p className="text-xs text-muted-foreground">Capacidad mesa: {currentMesa.totalVoters}</p>
                </div>
                {warningOver && <span className="text-xs text-amber-300">Supera total de votantes</span>}
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
              <p className="text-sm text-muted-foreground">Sin foto no puedes avanzar.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-4 flex flex-col items-center gap-3 text-center">
                {photoPreview ? (
                  <div className="w-full rounded-xl overflow-hidden border border-border/60 bg-black/40">
                    <img src={photoPreview} alt="E14" className="w-full object-contain" />
                  </div>
                ) : (
                  <div className="p-4 rounded-full bg-muted/30">
                    <FileImage className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <p className="text-sm font-semibold">Toma la foto del E14</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="w-full rounded-lg border border-border/60 bg-background/80 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-white"
                />
                <div className="flex w-full gap-2">
                  <Button variant="outline" className="flex-1 h-12" onClick={() => setPhotoPreview(null)} disabled={!photoPreview}>
                    Repetir foto
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                    onClick={goToConfirm}
                    disabled={!photoPreview}
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
                  <span className="font-semibold text-emerald-400">✔️ lista</span>
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
                  {currentMesa.candidates.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-background/60 rounded-lg px-3 py-2">
                      <span className="truncate mr-2">{c.name}</span>
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
                Ir a {mesaIndex < mesasTotal - 1 ? assignedMesas[mesaIndex + 1].label : "fin"}
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
