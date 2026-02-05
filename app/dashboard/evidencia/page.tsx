"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import jsPDF from "jspdf"
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
  Loader2,
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

type Mesa = { id: string; label: string; municipio?: string; puesto?: string }
type Cargo = { id: string; nombre: string }
type Partido = { id: string; nombre: string; cargoId: string }
type Candidato = {
  id: string
  nombre: string
  partidoId: string
  cargoId: string
  ballot_number?: number
  full_name?: string
  position?: string
  region?: string
  color?: string
  department_code?: string
  party?: string
}

function CandidateCatalogHint({ candidatos, cargoById, partyById }: { candidatos: Candidato[]; cargoById: Record<string, string>; partyById: Record<string, string> }) {
  const sample = candidatos.slice(0, 12)

  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4 text-sm text-muted-foreground space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-foreground">Catalogo de candidatos</p>
          <p className="text-xs text-muted-foreground">Mostrando datos de public.candidates: numero de tarjeton, nombre completo, cargo/position, partido y region.</p>
        </div>
        <Badge className="bg-zinc-900 border-zinc-800 text-xs">{candidatos.length} registrados</Badge>
      </div>

      {sample.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay candidatos cargados en el catalogo.</p>
      ) : (
        <div className="grid max-h-72 gap-2 overflow-auto pr-1">
          {sample.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-foreground leading-tight">{c.full_name ?? c.nombre}</div>
                {c.ballot_number ? <Badge className="bg-zinc-800 border-zinc-700 text-xs">Tarjeton {c.ballot_number}</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{c.position ?? cargoById[c.cargoId] ?? "Cargo sin nombre"}</span>
                <span className="text-zinc-500">•</span>
                <span>{c.party ?? partyById[c.partidoId] ?? "Sin partido"}</span>
                {c.region ? (
                  <>
                    <span className="text-zinc-500">•</span>
                    <span>{c.region}</span>
                  </>
                ) : null}
                {c.color ? <Badge className="bg-zinc-800 border-zinc-700 text-[10px]">Color {c.color}</Badge> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type PhotoSlot = { file: File; preview: string }

type VoteFlowState = {
  mesaId?: string
  cargoId?: string
  partidoId?: string
  candidatoId?: string
  votos: number
  photo?: File
  photoPreview?: string
  photos: PhotoSlot[]
  candidateVotes: Record<string, number>
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
  localPreview?: string
  tags: string[]
  voteReportId: string | null
  totalVotes?: number | null
  reportedAt?: string | null
  voteDetails?: VoteCandidateDetail[]
}

type VoteCandidateDetail = {
  candidateId: string
  votes: number
  fullName: string | null
  party: string | null
  position: string | null
  ballotNumber: number | null
  color: string | null
}

type VoteReportDetail = {
  id: string
  pollingStation: string | null
  municipality: string | null
  department: string | null
  address: string | null
  totalVotes: number
  reportedAt: string | null
  notes: string | null
  details: VoteCandidateDetail[]
  photos: Array<{
    id: string
    title: string
    url: string
    status: string
    uploadedAt: string
    municipality: string | null
    pollingStation: string | null
    uploadedBy: string | null
    uploadedById: string | null
  }>
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

const maxPhotos = 4

const chipFilters = [
  { key: "all", label: "Todos" },
  { key: "image", label: "Imagenes" },
  { key: "video", label: "Videos" },
  { key: "document", label: "Documentos" },
  { key: "verified", label: "Verificados" },
]

export default function EvidenciaPage() {
  const [view, setView] = useState<"hub" | "wizard" | "evidencias">("hub")
  const [flow, setFlow] = useState<VoteFlowState>({ votos: 0, photos: [], candidateVotes: {} })
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
  const [isOffline, setIsOffline] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<EvidenceItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reportDetail, setReportDetail] = useState<VoteReportDetail | null>(null)
  const [downloading, setDownloading] = useState(false)
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }),
    []
  )

  const notify = (message: string, description?: string) => toast({ title: message, description })

  const getDetailVotes = useCallback(() => {
    if (reportDetail?.details?.length) return reportDetail.details
    if (Array.isArray(detailItem?.voteDetails) && detailItem.voteDetails.length) return detailItem.voteDetails
    return []
  }, [detailItem, reportDetail])

  const fetchImageAsDataUrl = useCallback(async (url?: string | null) => {
    if (!url) return null
    if (url.startsWith("data:")) return url
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  }, [])

  const handleDownloadImage = useCallback(async () => {
    if (!detailItem) return
    const url = detailItem.url || detailItem.localPreview
    if (!url) {
      notify("Sin imagen", "No hay imagen disponible para descargar")
      return
    }
    try {
      setDownloading(true)
      if (url.startsWith("data:")) {
        const a = document.createElement("a")
        a.href = url
        a.download = `${detailItem.title || "evidencia"}.png`
        a.click()
        return
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error("No se pudo descargar la imagen")
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = href
      a.download = `${detailItem.title || "evidencia"}.jpg`
      a.click()
      URL.revokeObjectURL(href)
    } catch (err) {
      console.error(err)
      notify("Descarga fallida", "No se pudo descargar la imagen")
    } finally {
      setDownloading(false)
    }
  }, [detailItem, notify])

  const handleDownloadPdf = useCallback(async () => {
    if (!detailItem) return
    try {
      setDownloading(true)
      const votes = getDetailVotes()
      const imageUrl = detailItem.url || detailItem.localPreview
      const imageData = await fetchImageAsDataUrl(imageUrl)

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let y = 40

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(detailItem.title || "Evidencia", 40, y)
      y += 18

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(`Mesa: ${detailItem.pollingStation ?? "Sin dato"}`, 40, y)
      y += 14
      doc.text(`Municipio: ${detailItem.municipality ?? "Sin dato"}`, 40, y)
      y += 14
      doc.text(`Subido: ${new Date(detailItem.uploadedAt).toLocaleString("es-CO")}`, 40, y)
      y += 18

      if (imageData) {
        const imgProps = doc.getImageProperties(imageData)
        const maxWidth = pageWidth - 80
        const maxHeight = 260
        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height)
        const imgWidth = imgProps.width * ratio
        const imgHeight = imgProps.height * ratio
        const imageFormat = imageData.startsWith("data:image/png") ? "PNG" : "JPEG"
        doc.addImage(imageData, imageFormat, 40, y, imgWidth, imgHeight)
        y += imgHeight + 16
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Votos reportados", 40, y)
      y += 16

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      if (!votes.length) {
        doc.text("Sin detalle de votos.", 40, y)
      } else {
        votes.forEach((v) => {
          const labelBase = `${v.fullName ?? "Candidato"} (${v.party ?? ""})`
          const label = labelBase.replace(/\s+\)/g, ")").replace(/\(\s*\)/g, "")
          const line = `${label}: ${v.votes} votos`
          if (y > pageHeight - 40) {
            doc.addPage()
            y = 40
          }
          doc.text(line, 40, y)
          y += 14
        })
      }

      doc.save(`${detailItem.title || "evidencia"}.pdf`)
    } catch (err) {
      console.error(err)
      notify("Descarga fallida", "No se pudo generar el PDF")
    } finally {
      setDownloading(false)
    }
  }, [detailItem, fetchImageAsDataUrl, getDetailVotes, notify])

  const preload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mesasRes, catalogosRes, evidencesRes] = await Promise.all([
        fetch("/api/mesas-asignadas", { cache: "no-store" }),
        fetch("/api/catalogos", { cache: "no-store" }),
        fetch("/api/evidences", { cache: "no-store" }),
      ])

      // Mesas pueden fallar para perfiles admin; en ese caso continuamos con lista vacia.
      if (!catalogosRes.ok || !evidencesRes.ok) {
        setError("No se pudo cargar evidencias y catalogos")
        notify("Error de carga", "Verifica conexion o API")
        return
      }

      const mesasData = mesasRes.ok ? await mesasRes.json().catch(() => ({ items: [] })) : { items: [] }
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
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false)
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

  const handleDeleteEvidence = useCallback(async (item: EvidenceItem) => {
    if (!item?.id) return

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
    const isLocalOnly = item.id.startsWith("local-") || !isUuid

    // Remove instantly from UI
    let alreadyRemoved = false
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== item.id)
      if (next.length === prev.length) alreadyRemoved = true
      return next
    })

    // If the item is local/fallback (non-UUID), skip server call
    if (isLocalOnly) {
      notify("Evidencia eliminada", item.title || undefined)
      return
    }

    try {
      const res = await fetch("/api/evidences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })

      if (!res.ok) {
        const message = await res.text().catch(() => "No se pudo eliminar")
        throw new Error(message || `Status ${res.status}`)
      }

      notify("Evidencia eliminada", item.title || undefined)
      preload()
    } catch (err: any) {
      if (!alreadyRemoved) {
        setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]))
      }
      notify("No se pudo eliminar", err?.message)
    }
  }, [preload])

  const selectedMesaLabel = useMemo(
    () => mesas.find((m) => m.id === flow.mesaId)?.label ?? flow.mesaId,
    [flow.mesaId, mesas]
  )

  useEffect(() => {
    let cancelled = false
    if (!detailItem?.voteReportId) {
      setReportDetail(null)
      setDetailLoading(false)
      return
    }

    const fetchDetail = async () => {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/vote-reports/${detailItem.voteReportId}`)
        if (!res.ok) throw new Error("No se pudo obtener el reporte")
        const data = (await res.json()) as VoteReportDetail
        if (!cancelled) setReportDetail(data)
      } catch (err) {
        console.error(err)
        if (!cancelled) notify("No se pudo cargar el reporte", "Intenta de nuevo")
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [detailItem])

  const resetFlow = () => {
    setFlow({ votos: 0, photos: [], candidateVotes: {} })
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
      setFlow((prev) => ({ ...prev, photo: undefined, photoPreview: undefined, photos: [] }))
      return
    }
    const preview = URL.createObjectURL(file)
    setFlow((prev) => ({ ...prev, photo: file, photoPreview: preview, photos: [{ file, preview }] }))
    goNext()
  }

  const handleCandidateVote = (candidateId: string, value: number) => {
    setFlow((prev) => ({
      ...prev,
      candidateVotes: {
        ...prev.candidateVotes,
        [candidateId]: Math.max(0, isNaN(value) ? 0 : value),
      },
    }))
  }

  const handleAddPhotos = (files?: FileList | null) => {
    if (!files || files.length === 0) return

    const selected = Array.from(files)

    setFlow((prev) => {
      const current = prev.photos ?? []
      const remainingSlots = Math.max(0, 5 - current.length)
      const nextFiles = selected
        .slice(0, remainingSlots)
        .map((file) => ({ file, preview: URL.createObjectURL(file) }))

      if (nextFiles.length === 0) {
        notify(`Limite de ${maxPhotos} fotos`, "Elimina alguna para adjuntar mas")
        return prev
      }

      const merged = [...current, ...nextFiles].slice(0, maxPhotos)
      const first = merged[0]

      return {
        ...prev,
        photos: merged,
        photo: first?.file,
        photoPreview: first?.preview,
      }
    })

    goNext()
  }

  const handleRemovePhoto = (index: number) => {
    setFlow((prev) => {
      const next = [...(prev.photos ?? [])]
      next.splice(index, 1)
      return { ...prev, photos: next, photo: next[0]?.file, photoPreview: next[0]?.preview }
    })
  }

  const sendVote = useCallback(
    async (payload: VoteFlowState, showToast = true) => {
      try {
        const candidateEntries = Object.entries(payload.candidateVotes ?? {}).filter(([, votos]) => votos > 0)
        const legacyCandidate = payload.candidatoId && payload.votos > 0 ? [[payload.candidatoId, payload.votos]] : []
        const voteEntries = candidateEntries.length > 0 ? candidateEntries : legacyCandidate

        if (!payload.mesaId || voteEntries.length === 0) {
          throw new Error("Datos incompletos para enviar")
        }

        const details = voteEntries.map(([candidate_id, votes]) => ({ candidate_id, votes }))

        const photosToSend = payload.photos?.length ? payload.photos : payload.photo ? [{ file: payload.photo, preview: payload.photoPreview ?? "" }] : []
        const toDataUrl = (file: File) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

        const photoPayloads = await Promise.all(photosToSend.slice(0, maxPhotos).map((slot) => toDataUrl(slot.file)))

        const voteBody = {
          delegate_assignment_id: payload.mesaId,
          divipole_location_id: null,
          notes: null,
          details,
          photos: photoPayloads,
        }

        const voteRes = await fetch("/api/my/vote-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(voteBody),
        })

        const rawVoteText = await voteRes.text().catch(() => null)
        const voteJson = rawVoteText ? (() => { try { return JSON.parse(rawVoteText) } catch { return null } })() : null

        if (!voteRes.ok) {
          const reason = (voteJson as any)?.error || rawVoteText || `Error en votos (status ${voteRes.status})`
          console.error("vote-report error", { status: voteRes.status, detail: (voteJson as any)?.detail, body: rawVoteText })
          throw new Error(reason)
        }

        if (showToast) notify("Registro enviado", "Se guardo la votacion y las fotos")
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
    const voteEntries = Object.entries(flow.candidateVotes ?? {}).filter(([, votos]) => votos > 0)
    if (!flow.mesaId) {
      notify("Selecciona la mesa asignada")
      return
    }
    if (voteEntries.length === 0 && (!flow.candidatoId || flow.votos <= 0)) {
      notify("Ingresa votos para al menos un candidato")
      return
    }
    if ((flow.photos?.length ?? 0) === 0) {
      notify("Falta la foto obligatoria", `Sube al menos 1 foto (max ${maxPhotos})`)
      return
    }
    if ((flow.photos?.length ?? 0) > maxPhotos) {
      notify(`Solo ${maxPhotos} fotos permitidas`)
      return
    }

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
          <Card className="lg:col-span-2 border-border/70 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2 space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight">Centro de acción</CardTitle>
              <p className="text-sm text-muted-foreground">Accesos directos pensados para testigo: reporta tu mesa con foto E14 y gestiona lo que ya enviaste.</p>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <button
                onClick={() => setView("wizard")}
                className="group w-full rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-background p-4 text-left transition hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-base font-semibold text-foreground">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Camera className="h-5 w-5" />
                    </span>
                    Registrar votos + Foto E14
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Usa tu mesa asignada, ingresa votos y sube hasta 4 fotos (1 obligatoria). Flujo guiado y consistente.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> Listo para enviar
                  </div>
                </div>
              </button>

              <button
                onClick={() => setView("evidencias")}
                className="group w-full rounded-2xl border border-border/60 bg-gradient-to-br from-zinc-800/60 via-zinc-900/40 to-background p-4 text-left transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-base font-semibold text-foreground">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </span>
                    Ver / descargar evidencias
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Revisa lo enviado, descarga copias o marca verificado. Filtros rápidos por tipo y estado.
                  </p>
                  <div className="text-xs text-muted-foreground leading-snug">Mantén tus envíos ordenados y listos para auditoría.</div>
                </div>
              </button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Estado del sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {isOffline ? <WifiOff className="h-4 w-4 text-amber-400" /> : <Wifi className="h-4 w-4 text-emerald-400" />}
                <span className="font-semibold text-foreground">{isOffline ? "Offline" : "Online"}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                Datos listos: mesas asignadas, cargos, partidos, candidatos y evidencias. Sincroniza en segundo plano.
              </div>
              <div className="text-xs text-muted-foreground">Si pierdes conexión, sigue capturando; enviaremos tus envíos al volver en línea.</div>
            </CardContent>
          </Card>
        </div>
      )}

      {view === "wizard" && (
        <Card className="bg-zinc-900/70 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Captura rapida</p>
                <p className="text-xl font-semibold">Votos + Evidencias del puesto</p>
                <p className="text-sm text-muted-foreground">Elige tu mesa asignada, ingresa votos y adjunta hasta 4 fotos (1 obligatoria).</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-zinc-800 border-zinc-700">{flow.photos.length}/4 fotos</Badge>
                <Badge className="bg-zinc-800 border-zinc-700">{Object.values(flow.candidateVotes).filter((v) => v > 0).length} candidatos con votos</Badge>
                <Badge className="bg-zinc-800 border-zinc-700">Mesa: {selectedMesaLabel ?? "sin seleccionar"}</Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <AssignedMesasPanel mesas={mesas} selectedMesaId={flow.mesaId} onPick={(id) => setFlow((prev) => ({ ...prev, mesaId: id }))} />

              <div className="lg:col-span-2 space-y-4">
                <CandidateVotesPanel
                  cargos={cargos}
                  partidos={partidos}
                  candidatos={candidatos}
                  selectedCargoId={flow.cargoId}
                  selectedPartidoId={flow.partidoId}
                  candidateVotes={flow.candidateVotes}
                  onCargoChange={(id) => setFlow((prev) => ({ ...prev, cargoId: id, partidoId: undefined }))}
                  onPartidoChange={(id) => setFlow((prev) => ({ ...prev, partidoId: id }))}
                  onVoteChange={handleCandidateVote}
                  onResetVotes={() => setFlow((prev) => ({ ...prev, candidateVotes: {} }))}
                />

                <PhotoStack photos={flow.photos} onAdd={handleAddPhotos} onRemove={handleRemovePhoto} />

                <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Debes tener una mesa seleccionada, al menos un candidato con votos y minimo una foto.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="bg-zinc-800/60 border-zinc-700" onClick={() => setView("hub")}>
                      Cancelar
                    </Button>
                    <Button
                      className="bg-cyan-600 hover:bg-cyan-700"
                      disabled={!flow.mesaId || (flow.photos?.length ?? 0) === 0 || (Object.values(flow.candidateVotes).filter((v) => v > 0).length === 0 && (!flow.candidatoId || flow.votos <= 0))}
                      onClick={handleSubmit}
                    >
                      Enviar evidencias
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
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
                <EvidenceCard
                  key={item.id}
                  item={item}
                  dateFormatter={dateFormatter}
                  onVerify={() => notify("Marcado verificado")}
                  onView={() => setDetailItem(item)}
                  onDelete={() => handleDeleteEvidence(item)}
                ></EvidenceCard>
              ))}
            </div>
          )}

          <Dialog open={Boolean(detailItem)} onOpenChange={(open) => { if (!open) setDetailItem(null) }}>
            <DialogContent className="bg-zinc-900 border-zinc-800 sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>{detailItem?.title ?? "Evidencia"}</DialogTitle>
              </DialogHeader>
              {detailItem && (
                <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
                  <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/50">
                    <img
                      src={detailItem.url || detailItem.localPreview || ""}
                      alt={detailItem.title}
                      className="w-full h-[320px] md:h-[420px] object-contain bg-black"
                    />
                  </div>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Mesa reportada</p>
                          <p className="text-foreground font-semibold">{detailItem.pollingStation ?? "Sin dato"}</p>
                        </div>
                        <Badge className="bg-zinc-800 border-zinc-700 text-xs">{detailItem.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[11px] uppercase text-zinc-500">Municipio</p>
                          <p className="text-foreground font-semibold">{detailItem.municipality ?? "Sin dato"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] uppercase text-zinc-500">Subido</p>
                          <p className="text-foreground font-semibold">{dateFormatter.format(new Date(detailItem.uploadedAt))}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="text-foreground font-medium truncate">{detailItem.uploadedBy ?? "Desconocido"}</span>
                        </div>
                        <div className="text-right text-[11px] uppercase text-zinc-500">Autor del reporte</div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-zinc-500">Subido por</p>
                        <p className="text-foreground font-semibold">{detailItem.uploadedBy ?? "Sin dato"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase text-zinc-500">Descripcion</p>
                        <p className="text-foreground leading-snug">{detailItem.description ?? "Sin descripcion"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detailItem.tags.map((tag) => (
                          <Badge key={`${detailItem.id}-detail-${tag}`} variant="outline" className="bg-zinc-800/50 border-zinc-700 text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {detailItem.tags.length === 0 && <p className="text-xs text-muted-foreground">Sin etiquetas</p>}
                      </div>
                    </div>

                    {detailLoading && (
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando votos y fotos de la mesa...
                      </div>
                    )}

                    {reportDetail && (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Total votos</span>
                            <span className="text-foreground font-semibold">{reportDetail.totalVotes}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Mesa</span>
                            <span className="text-foreground font-semibold">{reportDetail.pollingStation ?? detailItem.pollingStation ?? "Sin dato"}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Municipio</span>
                            <span className="text-foreground font-semibold">{reportDetail.municipality ?? detailItem.municipality ?? "Sin dato"}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Votos reportados</p>
                          <div className="grid gap-2">
                            {reportDetail.details.map((detail) => (
                              <div key={detail.candidateId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-foreground leading-tight">{detail.fullName ?? "Candidato"}</p>
                                    <p className="text-[11px] text-muted-foreground flex flex-wrap gap-1">
                                      {detail.position ? <span>{detail.position}</span> : null}
                                      {detail.party ? <span>• {detail.party}</span> : null}
                                      {detail.ballotNumber ? <Badge className="bg-zinc-800 border-zinc-700">Tarjeton {detail.ballotNumber}</Badge> : null}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">{detail.votes}</p>
                                    <p className="text-[11px] text-muted-foreground">votos</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {reportDetail.details.length === 0 && (
                              <p className="text-xs text-muted-foreground">Sin votos asociados al reporte.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Fotos de esta mesa</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {reportDetail.photos.map((photo) => (
                              <div key={photo.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/40">
                                <img src={photo.url} alt={photo.title} className="h-32 w-full object-cover bg-black" />
                                <div className="p-2 text-xs">
                                  <p className="font-semibold text-foreground line-clamp-1">{photo.title}</p>
                                  <p className="text-muted-foreground">{dateFormatter.format(new Date(photo.uploadedAt))}</p>
                                </div>
                              </div>
                            ))}
                            {reportDetail.photos.length === 0 && (
                              <p className="text-xs text-muted-foreground">Sin fotos asociadas a esta mesa.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {!detailLoading && (!reportDetail || reportDetail.details.length === 0) && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total votos</span>
                          <span className="text-foreground font-semibold">{detailItem.totalVotes ?? reportDetail?.totalVotes ?? 0}</span>
                        </div>
                        {Array.isArray(detailItem.voteDetails) && detailItem.voteDetails.length > 0 ? (
                          <div className="grid gap-2">
                            {detailItem.voteDetails.map((detail) => (
                              <div key={`${detailItem.id}-${detail.candidateId}`} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-foreground leading-tight">{detail.fullName ?? "Candidato"}</p>
                                    <p className="text-[11px] text-muted-foreground flex flex-wrap gap-1">
                                      {detail.position ? <span>{detail.position}</span> : null}
                                      {detail.party ? <span>• {detail.party}</span> : null}
                                      {detail.ballotNumber ? <Badge className="bg-zinc-800 border-zinc-700">Tarjeton {detail.ballotNumber}</Badge> : null}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">{detail.votes}</p>
                                    <p className="text-[11px] text-muted-foreground">votos</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Detalle de votos por candidato no disponible para este reporte.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        variant="outline"
                        className="bg-zinc-800/60 border-zinc-700"
                        onClick={handleDownloadImage}
                        disabled={downloading}
                      >
                        Descargar imagen
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                      >
                        Descargar PDF con votos
                      </Button>
                      <Button variant="ghost" className="text-emerald-400" onClick={() => setDetailItem(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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

function AssignedMesasPanel({ mesas, selectedMesaId, onPick }: { mesas: Mesa[]; selectedMesaId?: string; onPick: (id: string) => void }) {
  const selectedMesa = mesas.find((m) => m.id === selectedMesaId)

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4" /> Mesas asignadas
        </div>
        <Badge className="bg-zinc-800 border-zinc-700 text-xs">{mesas.length} mesas</Badge>
      </div>

      {mesas.length === 0 && <p className="text-sm text-muted-foreground">Sin mesas asignadas para este testigo.</p>}

      <div className="grid gap-2">
        {mesas.map((mesa) => {
          const active = mesa.id === selectedMesaId
          return (
            <button
              key={mesa.id}
              onClick={() => onPick(mesa.id)}
              className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left transition ${active ? "border-cyan-500 bg-cyan-500/10" : "border-zinc-800 bg-zinc-900"}`}
            >
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Mesa {mesa.label}</span>
                <Badge className={active ? "bg-cyan-600" : "bg-zinc-800 border-zinc-700"}>{active ? "Actual" : "Elegir"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{mesa.puesto || mesa.municipio || "Puesto por definir"}</p>
            </button>
          )
        })}
      </div>

      {selectedMesa && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
          <p className="font-semibold">Mesa {selectedMesa.label}</p>
          <p className="text-muted-foreground">{selectedMesa.puesto || selectedMesa.municipio || "Sin informacion"}</p>
        </div>
      )}
    </div>
  )
}

function CandidateVotesPanel({
  cargos,
  partidos,
  candidatos,
  selectedCargoId,
  selectedPartidoId,
  candidateVotes,
  onCargoChange,
  onPartidoChange,
  onVoteChange,
  onResetVotes,
}: {
  cargos: Cargo[]
  partidos: Partido[]
  candidatos: Candidato[]
  selectedCargoId?: string
  selectedPartidoId?: string
  candidateVotes: Record<string, number>
  onCargoChange: (id: string) => void
  onPartidoChange: (id?: string) => void
  onVoteChange: (candidateId: string, value: number) => void
  onResetVotes: () => void
}) {
  const cargoById = useMemo(() => Object.fromEntries(cargos.map((c) => [c.id, c.nombre])), [cargos])
  const partyById = useMemo(() => Object.fromEntries(partidos.map((p) => [p.id, p.nombre])), [partidos])

  const filteredPartidos = partidos.filter((p) => !selectedCargoId || p.cargoId === selectedCargoId)
  const filteredCandidatos = candidatos.filter((c) => (!selectedCargoId || c.cargoId === selectedCargoId) && (!selectedPartidoId || c.partidoId === selectedPartidoId))

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Votos por candidato</p>
          <p className="text-xs text-muted-foreground">Escribe la cantidad manualmente, ej: 10 para Maria, 23 para Jose.</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={onResetVotes}>
          Limpiar votos
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {cargos.map((cargo) => (
          <Button
            key={cargo.id}
            variant={cargo.id === selectedCargoId ? "default" : "outline"}
            className={`${cargo.id === selectedCargoId ? "bg-cyan-600" : "bg-zinc-800/60 border-zinc-700"} rounded-full px-4 text-xs`}
            onClick={() => onCargoChange(cargo.id)}
          >
            {cargo.nombre}
          </Button>
        ))}
      </div>

      {filteredPartidos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-zinc-800 border-zinc-700 text-xs">Filtrar por partido</Badge>
          {filteredPartidos.map((partido) => (
            <Button
              key={partido.id}
              variant={partido.id === selectedPartidoId ? "default" : "outline"}
              className={`${partido.id === selectedPartidoId ? "bg-emerald-600" : "bg-zinc-800/60 border-zinc-700"} rounded-full px-4 text-xs`}
              onClick={() => onPartidoChange(partido.id)}
            >
              {partido.nombre}
            </Button>
          ))}
          {selectedPartidoId && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onPartidoChange(undefined)}>
              Quitar filtro
            </Button>
          )}
        </div>
      )}

      {filteredCandidatos.length === 0 && (
        <CandidateCatalogHint candidatos={candidatos} cargoById={cargoById} partyById={partyById} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredCandidatos.map((candidato) => (
          <div key={candidato.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <div>
              <p className="font-semibold leading-tight">{candidato.full_name ?? candidato.nombre}</p>
              <p className="text-xs text-muted-foreground flex flex-wrap gap-1">
                <span>{partyById[candidato.partidoId] ?? candidato.party ?? "Sin partido"}</span>
                {candidato.ballot_number ? <Badge className="bg-zinc-800 border-zinc-700">Tarjeton {candidato.ballot_number}</Badge> : null}
              </p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              className="w-24 bg-zinc-900 border-zinc-800 text-right"
              value={candidateVotes[candidato.id] ?? ""}
              placeholder="0"
              onChange={(e) => onVoteChange(candidato.id, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PhotoStack({ photos, onAdd, onRemove }: { photos: PhotoSlot[]; onAdd: (files: FileList | null) => void; onRemove: (index: number) => void }) {
  const remaining = Math.max(0, 5 - (photos?.length ?? 0))

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Fotos del E14</p>
          <p className="text-xs text-muted-foreground">Minimo una foto obligatoria. Maximo 5 por envio.</p>
        </div>
        <Badge className="bg-zinc-800 border-zinc-700 text-xs">{photos.length}/5</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className={`flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed ${remaining === 0 ? "border-zinc-800 bg-zinc-950 text-muted-foreground" : "border-cyan-600/60 bg-cyan-600/10 text-cyan-50"}`}>
          <div className="flex flex-col items-center gap-1 text-sm font-semibold">
            <Camera className="h-5 w-5" /> {remaining === 0 ? "Limite alcanzado" : "Tomar / subir foto"}
            <span className="text-xs text-muted-foreground">{remaining} lugares libres</span>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            disabled={remaining === 0}
            onClick={(e) => {
              // Ensure the same photo can be selected again without needing a double pick
              ;(e.currentTarget as HTMLInputElement).value = ""
            }}
            onChange={(e) => {
              const files = e.target.files
              onAdd(files)
              e.target.value = ""
            }}
          />
        </label>

        {photos.map((slot, index) => (
          <div key={`${slot.preview}-${index}`} className="relative h-32 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <img src={slot.preview} alt="Foto subida" className="h-full w-full object-cover" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-7 w-7 bg-zinc-900/80"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Revisa que la foto sea legible. Si tomas varias, prioriza las que muestren firmas y totales.</p>
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

function EvidenceCard({ item, onVerify, onView, onDelete, dateFormatter }: { item: EvidenceItem; onVerify: () => void; onView: () => void; onDelete: () => void; dateFormatter: Intl.DateTimeFormat }) {
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

        <div className="flex flex-wrap gap-2">
          {item.pollingStation && <Badge className="bg-zinc-800 border-zinc-700 text-xs">Mesa/Puesto: {item.pollingStation}</Badge>}
          {item.municipality && <Badge className="bg-zinc-800 border-zinc-700 text-xs">{item.municipality}</Badge>}
          {item.voteReportId && <Badge className="bg-emerald-600/30 border-emerald-700 text-emerald-100 text-xs">Con votos</Badge>}
          {typeof item.totalVotes === "number" && (
            <Badge className="bg-emerald-900/30 border-emerald-800 text-emerald-100 text-xs">
              Total votos: {item.totalVotes}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {item.pollingStation && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.pollingStation}</span>
          )}
          {item.uploadedBy && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {item.uploadedBy}</span>
          )}
          {item.uploadedAt && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {dateFormatter.format(new Date(item.uploadedAt))}</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={`${item.id}-${tag}`} variant="outline" className="bg-zinc-800/50 border-zinc-700 text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-zinc-800/60 border-zinc-700"
            onClick={onView}
          >
            <Eye className="h-4 w-4 mr-2" /> Ver
          </Button>
          <div className="flex gap-2 flex-wrap justify-end">
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
              className="h-9 w-9 min-w-[36px]"
              onClick={() => window.open(item.url || item.localPreview, "_blank")}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 min-w-[36px] text-red-400"
              onClick={onDelete}
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
      const res = await fetch("/api/evidences", {
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
