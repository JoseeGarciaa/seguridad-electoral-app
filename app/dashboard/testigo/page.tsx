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
  Lock,
  Plus,
  ShieldCheck,
  Smartphone,
  Table,
  X,
} from "lucide-react"

type Step = "home" | "votos" | "foto" | "confirm" | "done"
type ListType = "Preferente" | "No Preferente" | null
type SpecialVoteKey = "blank" | "nulls" | "unmarked"

type Candidate = {
  id: string
  fullName: string
  ballotNumber: number | null
  position: string | null
  party: string | null
  color: string | null
  region: string | null
  partyLogo: string | null
  listType: ListType
}

type PhotoItem = { file: File; preview: string }

interface Mesa {
  id: string
  label: string
  municipality?: string | null
  totalVoters?: number | null
}

interface CompletedMesa {
  id: string
  label: string
  totalVotos: number
  note: string
}

type SpecialVotes = Record<SpecialVoteKey, number>

const EMPTY_SPECIAL_VOTES: SpecialVotes = {
  blank: 0,
  nulls: 0,
  unmarked: 0,
}

const SPECIAL_VOTE_LABELS: Record<SpecialVoteKey, string> = {
  blank: "Voto en Blanco",
  nulls: "Votos Nulos",
  unmarked: "Votos No Marcados",
}

const localKey = (mesaId: string) => `testigo-draft-${mesaId}`

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern)
  }
}

const normalizeListType = (value: any): ListType => {
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.includes("no") && normalized.includes("prefer")) return "No Preferente"
  if (normalized.includes("prefer")) return "Preferente"
  return null
}

const normalizeNonNegativeInt = (value: any) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  if (parsed < 0) return 0
  return Math.min(Math.trunc(parsed), 9999)
}

const normalizePartyName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const PARTY_LOGOS: Array<{ tokens: string[]; src: string }> = [
  { tokens: ["coalicion", "verde"], src: "/Coalición_verde.png" },
  { tokens: ["alianza", "verde"], src: "/Coalición_verde.png" },
  { tokens: ["cambio", "radical"], src: "/Cambio_Radical.png" },
  { tokens: ["partido", "u"], src: "/Logo_Partido_U_Colombia_.png" },
  { tokens: ["mira", "dignidad", "compromiso"], src: "/Mira_dignidad_compromiso.jpg" },
  { tokens: ["movimiento", "agrario", "colombiano"], src: "/Movimiento_Agrario_Colombiano.png" },
  { tokens: ["movimiento", "salvacion", "nacional"], src: "/Movimiento_de_Salvación_Nacional_.png" },
  { tokens: ["pacto", "historico"], src: "/Pacto_Historico.png" },
  { tokens: ["centro", "democratico"], src: "/Partido_Centro_Democrático_.png" },
  { tokens: ["colombia", "renaciente"], src: "/Partido_Colombia_renaciente.png" },
  { tokens: ["conservador", "colombiano"], src: "/partido_Conservador_Colombiano_.png" },
  { tokens: ["liberal", "colombia"], src: "/PARTIDO_LIBERAL_COLOMBIA.png" },
  { tokens: ["nuevo", "liberalismo"], src: "/Partido_Nuevo_liberalismo.png" },
]

const normalizeLogoSrc = (logo: string | null | undefined) => {
  if (!logo) return null
  if (/^(https?:\/\/|data:|blob:)/i.test(logo)) return logo
  return logo.startsWith("/") ? logo : `/${logo}`
}

const resolvePartyLogo = (partyName: string | null | undefined, explicitLogo?: string | null) => {
  const fromApi = normalizeLogoSrc(explicitLogo)
  if (fromApi) return fromApi

  const normalizedParty = normalizePartyName(partyName ?? "")
  if (!normalizedParty) return null

  const matched = PARTY_LOGOS.find(({ tokens }) => tokens.every((token) => normalizedParty.includes(token)))
  return matched?.src ?? null
}

const safePartyKey = (party: string | null | undefined) =>
  (party ?? "Independiente").trim().toLowerCase()

const mergeNotesWithSpecialVotes = (baseNote: string, specialVotes: SpecialVotes) => {
  const summary = `[ResumenMesa] blanco=${specialVotes.blank}; nulos=${specialVotes.nulls}; no_marcados=${specialVotes.unmarked}`
  const cleanBase = baseNote.trim().replace(/\n?\[ResumenMesa\].*$/i, "")
  return cleanBase ? `${cleanBase}\n${summary}` : summary
}

export default function TestigoElectoralPage() {
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [mesaIndex, setMesaIndex] = useState(0)
  const [step, setStep] = useState<Step>("home")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle")
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [draftVotes, setDraftVotes] = useState<Record<string, number>>({})
  const [specialVotes, setSpecialVotes] = useState<SpecialVotes>(EMPTY_SPECIAL_VOTES)
  const [note, setNote] = useState("")
  const [completedMesas, setCompletedMesas] = useState<CompletedMesa[]>([])
  const [reportsMap, setReportsMap] = useState<Record<string, { id: string; total: number }>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const autosaveVotesRef = useRef<Record<string, number>>({})
  const autosaveSpecialVotesRef = useRef<SpecialVotes>(EMPTY_SPECIAL_VOTES)
  const autosaveNoteRef = useRef("")
  const autoAdvanceTimerRef = useRef<number | null>(null)

  const maxPhotos = 4
  const currentMesa = mesas[mesaIndex]
  const mesasTotal = mesas.length
  const mesaProgress = mesasTotal ? mesaIndex + 1 : 0

  useEffect(() => {
    autosaveVotesRef.current = draftVotes
  }, [draftVotes])

  useEffect(() => {
    autosaveSpecialVotesRef.current = specialVotes
  }, [specialVotes])

  useEffect(() => {
    autosaveNoteRef.current = note
  }, [note])

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
        const catalogosJson = await catalogosRes.json().catch(() => ({ candidatos: [], partidos: [] }))

        if (cancelled) return

        const mappedMesas: Mesa[] = Array.isArray(mesasJson.items)
          ? mesasJson.items.map((item: any) => ({
              id: String(item.id),
              label: item.label ?? "Mesa asignada",
              municipality: item.municipio ?? item.municipality ?? null,
              totalVoters: item.total_voters ?? null,
            }))
          : []

        const partyMetaByName = new Map<string, { logo: string | null; listType: ListType }>()
        if (Array.isArray(catalogosJson.partidos)) {
          catalogosJson.partidos.forEach((party: any) => {
            const partyName = String(party?.party ?? party?.nombre ?? party?.name ?? "Independiente")
            const logo =
              (typeof party?.logo === "string" && party.logo) ||
              (typeof party?.logo_url === "string" && party.logo_url) ||
              (typeof party?.image_url === "string" && party.image_url) ||
              (typeof party?.party_logo === "string" && party.party_logo) ||
              null
            const listType = normalizeListType(
              party?.list_type ?? party?.tipo_lista ?? party?.lista_tipo ?? party?.tipo,
            )
            partyMetaByName.set(safePartyKey(partyName), { logo: resolvePartyLogo(partyName, logo), listType })
          })
        }

        const mappedCandidates: Candidate[] = Array.isArray(catalogosJson.candidatos)
          ? catalogosJson.candidatos.map((c: any) => {
              const partyName = c.party ?? c.partido ?? "Independiente"
              const partyMeta = partyMetaByName.get(safePartyKey(partyName))
              return {
                id: String(c.id),
                fullName: c.full_name ?? c.nombre ?? "Candidato",
                ballotNumber: typeof c.ballot_number === "number" ? c.ballot_number : null,
                position: c.position ?? c.cargo ?? null,
                party: partyName,
                color: c.color ?? null,
                region: c.region ?? null,
                partyLogo:
                  resolvePartyLogo(
                    partyName,
                    (typeof c.party_logo === "string" && c.party_logo) ||
                      (typeof c.logo === "string" && c.logo) ||
                      (typeof c.logo_url === "string" && c.logo_url) ||
                      partyMeta?.logo ||
                      null,
                  ),
                listType:
                  normalizeListType(c.list_type ?? c.tipo_lista ?? c.lista_tipo ?? c.tipo) ??
                  partyMeta?.listType ??
                  null,
              }
            })
          : []

        setMesas(mappedMesas)
        setCandidates(mappedCandidates)
        setMesaIndex(0)
        setStep("home")
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
      const parsedVotes = parsed?.votes ?? {}
      const normalizedVotes: Record<string, number> = {}
      candidates.forEach((candidate) => {
        normalizedVotes[candidate.id] = normalizeNonNegativeInt(parsedVotes[candidate.id])
      })
      setDraftVotes(normalizedVotes)
      setSpecialVotes({
        blank: normalizeNonNegativeInt(parsed?.specialVotes?.blank),
        nulls: normalizeNonNegativeInt(parsed?.specialVotes?.nulls),
        unmarked: normalizeNonNegativeInt(parsed?.specialVotes?.unmarked),
      })
      setNote(parsed?.note || "")
    } else {
      const zeros: Record<string, number> = {}
      candidates.forEach((candidate) => {
        zeros[candidate.id] = 0
      })
      setDraftVotes(zeros)
      setSpecialVotes(EMPTY_SPECIAL_VOTES)
      setNote("")
    }

    setPhotos((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.preview))
      return []
    })
  }, [mesaIndex, currentMesa?.id, candidates])

  useEffect(() => {
    if (!currentMesa) return
    const timer = window.setInterval(() => {
      localStorage.setItem(
        localKey(currentMesa.id),
        JSON.stringify({
          votes: autosaveVotesRef.current,
          specialVotes: autosaveSpecialVotesRef.current,
          note: autosaveNoteRef.current,
        }),
      )
      setSavingState((prev) => (prev === "saving" ? prev : "saved"))
    }, 3000)

    return () => {
      window.clearInterval(timer)
      localStorage.setItem(
        localKey(currentMesa.id),
        JSON.stringify({
          votes: autosaveVotesRef.current,
          specialVotes: autosaveSpecialVotesRef.current,
          note: autosaveNoteRef.current,
        }),
      )
    }
  }, [currentMesa?.id])

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current)
      }
    }
  }, [])

  const groupedParties = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        name: string
        logo: string | null
        listType: ListType
        candidates: Candidate[]
      }
    >()

    candidates.forEach((candidate) => {
      const name = candidate.party ?? "Independiente"
      const key = safePartyKey(name)
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          logo: candidate.partyLogo,
          listType: candidate.listType,
          candidates: [candidate],
        })
      } else {
        const item = map.get(key)!
        item.candidates.push(candidate)
        if (!item.logo && candidate.partyLogo) item.logo = candidate.partyLogo
        if (!item.listType && candidate.listType) item.listType = candidate.listType
      }
    })

    return Array.from(map.values()).map((party) => ({
      ...party,
      candidates: [...party.candidates].sort((a, b) => {
        const aNumber = a.ballotNumber ?? Number.MAX_SAFE_INTEGER
        const bNumber = b.ballotNumber ?? Number.MAX_SAFE_INTEGER
        if (aNumber !== bNumber) return aNumber - bNumber
        return a.fullName.localeCompare(b.fullName)
      }),
    }))
  }, [candidates])

  const orderedFieldKeys = useMemo(() => {
    const candidateKeys = groupedParties.flatMap((party) =>
      party.candidates.map((candidate) => `candidate:${candidate.id}`),
    )
    return [...candidateKeys, "special:blank", "special:nulls", "special:unmarked"]
  }, [groupedParties])

  const totalVotosCandidatos = useMemo(
    () => Object.values(draftVotes).reduce((acc, value) => acc + (Number.isNaN(value) ? 0 : value), 0),
    [draftVotes],
  )

  const totalVotosBlanco = specialVotes.blank
  const totalVotosNulos = specialVotes.nulls
  const totalVotosNoMarcados = specialVotes.unmarked
  const totalGeneralVotos = totalVotosCandidatos + totalVotosBlanco + totalVotosNulos + totalVotosNoMarcados
  const mesaCapacity = currentMesa?.totalVoters ?? null
  const warningOver = mesaCapacity !== null && totalGeneralVotos > mesaCapacity
  const completedCount = completedMesas.length
  const pendingCount = Math.max(mesasTotal - completedCount, 0)
  const isCurrentMesaFinalized = Boolean(currentMesa && reportsMap[currentMesa.id])

  const focusField = (fieldKey: string) => {
    const input = inputRefs.current[fieldKey]
    if (!input) return
    input.focus()
    input.select()
  }

  const focusNextField = (currentFieldKey: string) => {
    const currentIndex = orderedFieldKeys.findIndex((key) => key === currentFieldKey)
    if (currentIndex === -1) return
    const nextKey = orderedFieldKeys[currentIndex + 1]
    if (!nextKey) return
    focusField(nextKey)
  }

  const scheduleAutoAdvance = (currentFieldKey: string) => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current)
    }
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      focusNextField(currentFieldKey)
    }, 650)
  }

  const updateCandidateVotes = (candidateId: string, value: number, autoAdvance = false) => {
    if (isCurrentMesaFinalized) return
    setSavingState("idle")
    setDraftVotes((prev) => ({ ...prev, [candidateId]: normalizeNonNegativeInt(value) }))
    if (autoAdvance) scheduleAutoAdvance(`candidate:${candidateId}`)
  }

  const updateSpecialVotes = (type: SpecialVoteKey, value: number, autoAdvance = false) => {
    if (isCurrentMesaFinalized) return
    setSavingState("idle")
    setSpecialVotes((prev) => ({ ...prev, [type]: normalizeNonNegativeInt(value) }))
    if (autoAdvance) scheduleAutoAdvance(`special:${type}`)
  }

  const incrementCandidate = (candidateId: string) => {
    vibrate(5)
    updateCandidateVotes(candidateId, (draftVotes[candidateId] ?? 0) + 1)
  }

  const decrementCandidate = (candidateId: string) => {
    vibrate(5)
    updateCandidateVotes(candidateId, (draftVotes[candidateId] ?? 0) - 1)
  }

  const incrementSpecial = (type: SpecialVoteKey) => {
    vibrate(5)
    updateSpecialVotes(type, (specialVotes[type] ?? 0) + 1)
  }

  const decrementSpecial = (type: SpecialVoteKey) => {
    vibrate(5)
    updateSpecialVotes(type, (specialVotes[type] ?? 0) - 1)
  }

  const clearPhotos = () => {
    setPhotos((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.preview))
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
    if (isCurrentMesaFinalized) {
      toast({ title: "Mesa finalizada", description: "Esta mesa ya fue enviada y bloqueada." })
      return
    }
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

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("No se pudo leer la imagen"))
      reader.readAsDataURL(file)
    })

  const handleConfirm = async () => {
    if (!currentMesa) return
    if (isCurrentMesaFinalized) {
      toast({ title: "Mesa finalizada", description: "Esta mesa ya fue enviada y no permite edición." })
      return
    }

    const primaryConfirm = window.confirm(
      `¿Finalizar mesa ${currentMesa.label}?\n\nTotal general: ${totalGeneralVotos} votos.\nEsta acción bloqueará la edición posterior.`,
    )
    if (!primaryConfirm) return

    if (warningOver && mesaCapacity !== null) {
      const overConfirm = window.confirm(
        `El total general (${totalGeneralVotos}) supera votantes estimados (${mesaCapacity}). ¿Deseas continuar?`,
      )
      if (!overConfirm) return
    }

    setSavingState("saving")
    vibrate(20)

    try {
      if (photos.length === 0) {
        throw new Error("Debes subir al menos una foto del E14")
      }
      if (photos.length > maxPhotos) {
        throw new Error(`Solo se permiten ${maxPhotos} fotos por mesa`)
      }

      const photoPayloads = await Promise.all(photos.map((photo) => fileToDataUrl(photo.file)))

      const payload = {
        delegate_assignment_id: currentMesa.id,
        divipole_location_id: null,
        notes: mergeNotesWithSpecialVotes(note, specialVotes),
        details: candidates.map((candidate) => ({
          candidate_id: candidate.id,
          votes: draftVotes[candidate.id] ?? 0,
        })),
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
      toast({ title: "Mesa finalizada", description: `${currentMesa.label} bloqueada correctamente` })
      setReportsMap((prev) => ({
        ...prev,
        [currentMesa.id]: { id: reportId ?? currentMesa.id, total: totalGeneralVotos },
      }))
      setCompletedMesas((prev) => {
        const filtered = prev.filter((mesa) => mesa.id !== currentMesa.id)
        return [...filtered, { id: currentMesa.id, label: currentMesa.label, totalVotos: totalGeneralVotos, note }]
      })
      localStorage.removeItem(localKey(currentMesa.id))
      setStep("done")
    } catch (err: any) {
      const message = err?.message ?? "Error al guardar"
      setSavingState("idle")
      toast({ title: "Error", description: message })
    }
  }

  const goNextMesa = () => {
    const nextIndex = mesas.findIndex((mesa, index) => index > mesaIndex && !reportsMap[mesa.id])
    if (nextIndex >= 0) {
      setMesaIndex(nextIndex)
      setSavingState("idle")
      clearPhotos()
      setStep("votos")
      return
    }
    setStep("home")
  }

  const cancelCurrentMesa = () => {
    if (!currentMesa) return
    if (isCurrentMesaFinalized) {
      toast({ title: "Mesa finalizada", description: "No se puede cancelar una mesa finalizada." })
      return
    }
    vibrate([10, 20])
    const zeros: Record<string, number> = {}
    candidates.forEach((candidate) => {
      zeros[candidate.id] = 0
    })
    setDraftVotes(zeros)
    setSpecialVotes(EMPTY_SPECIAL_VOTES)
    setNote("")
    clearPhotos()
    setSavingState("idle")
    setStep("home")
    localStorage.removeItem(localKey(currentMesa.id))
    toast({ title: "Registro cancelado", description: `${currentMesa.label} reiniciada` })
  }

  const openMesa = (index: number) => {
    const mesa = mesas[index]
    if (!mesa) return
    if (reportsMap[mesa.id]) {
      toast({ title: "Mesa finalizada", description: "Esta mesa ya fue cerrada y no permite edición." })
      return
    }
    setMesaIndex(index)
    setStep("votos")
  }

  const nextPendingMesaIndex = useMemo(() => {
    const idx = mesas.findIndex((mesa) => !reportsMap[mesa.id])
    return idx === -1 ? 0 : idx
  }, [mesas, reportsMap])

  const statusLabel = step === "done" ? "Finalizada" : savingState === "saving" ? "Enviando" : "Borrador"
  const statusColor =
    step === "done" ? "text-emerald-400" : savingState === "saving" ? "text-amber-300" : "text-muted-foreground"

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
            <p className="text-sm text-muted-foreground">
              Revisa con tu líder para asignarte un puesto. Aquí solo verás tus propias mesas.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-black/40 text-foreground">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Puesto asignado
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {currentMesa.label}
              </Badge>
              {currentMesa.municipality && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {currentMesa.municipality}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Mesa {mesaProgress} de {mesasTotal}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-medium">{statusLabel}</span>
              <span className={statusColor}>
                {step === "done" ? "✔️ Mesa cerrada" : photos.length > 0 ? "E14 listo" : "E14 pendiente"}
              </span>
              <span className="text-muted-foreground">Solo ves tus mesas asignadas</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <Badge variant="outline" className="text-xs">
              Perfil Testigo
            </Badge>
          </div>
        </div>
      </div>

      <div className={`px-4 pb-24 space-y-4 mx-auto ${step === "votos" ? "max-w-7xl" : "max-w-2xl"}`}>
        <Card className="bg-card/80 border-border/60 shadow-md">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Mesas finalizadas</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {completedCount}/{mesasTotal}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-300">{pendingCount}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Table className="h-4 w-4" />
              Captura por tarjetón: partidos, candidatos y votos especiales.
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl border border-border/60 bg-destructive/10 text-destructive px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {step === "home" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mesas asignadas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Las mesas finalizadas quedan bloqueadas para edición.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {mesas.map((mesa, index) => {
                  const completed = completedMesas.find((item) => item.id === mesa.id)
                  const status = completed ? "Finalizada" : "Pendiente"
                  return (
                    <div
                      key={mesa.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{mesa.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{mesa.municipality ?? "Puesto asignado"}</p>
                        <p className={`text-xs ${completed ? "text-emerald-400" : "text-amber-300"}`}>{status}</p>
                      </div>
                      <Button
                        size="sm"
                        className="min-w-[120px]"
                        onClick={() => openMesa(index)}
                        disabled={Boolean(completed)}
                        variant={completed ? "outline" : "default"}
                      >
                        {completed ? "Finalizada" : "Abrir"}
                      </Button>
                    </div>
                  )
                })}
              </div>
              <Button
                size="lg"
                className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openMesa(nextPendingMesaIndex)}
                disabled={pendingCount === 0}
              >
                {pendingCount === 0 ? "Todas finalizadas" : `Reanudar ${mesas[nextPendingMesaIndex]?.label}`}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "votos" && (
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            {isCurrentMesaFinalized && (
              <div className="absolute inset-0 z-50 rounded-2xl bg-background/85 backdrop-blur-sm flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-border/60 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Lock className="h-5 w-5 text-emerald-400" />
                      Mesa en modo solo lectura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-muted-foreground">
                      Esta mesa ya fue finalizada y enviada. La edición está bloqueada para proteger la integridad del reporte.
                    </p>
                    <Button className="w-full" onClick={() => setStep("home")}>Volver a mesas asignadas</Button>
                  </CardContent>
                </Card>
              </div>
            )}
            <div className="space-y-4">
              <Card className="bg-card border-border/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Tarjeta Electoral · Captura de votos
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ingreso visual por partido, con navegación automática y teclado numérico móvil.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                    Interfaz optimizada para campo: botones grandes, alto contraste y uso táctil.
                  </div>
                  {warningOver && mesaCapacity !== null && (
                    <div className="rounded-xl border border-amber-400/60 bg-amber-400/10 p-3 text-sm text-amber-200">
                      Advertencia: el total general ({totalGeneralVotos}) supera votantes estimados ({mesaCapacity}).
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {groupedParties.map((party) => (
                  <Card key={party.key} className="border-border/60 bg-card/90 shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {party.logo ? (
                          <img
                            src={party.logo}
                            alt={`Logo ${party.name}`}
                            className="h-12 w-12 rounded-lg border border-border/60 object-cover bg-background"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg border border-border/60 bg-muted flex items-center justify-center text-sm font-bold">
                            {party.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-tight truncate">{party.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Lista {party.listType ?? "No Preferente"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {party.candidates.map((candidate) => {
                        const votes = draftVotes[candidate.id] ?? 0
                        return (
                          <div key={candidate.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{candidate.fullName}</p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {candidate.position ?? "Cargo"}
                                  {candidate.ballotNumber !== null ? ` · #${candidate.ballotNumber}` : " · S/N"}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs px-2 py-1">
                                {candidate.ballotNumber !== null ? `#${candidate.ballotNumber}` : "S/N"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 w-12 p-0"
                                onClick={() => decrementCandidate(candidate.id)}
                                disabled={isCurrentMesaFinalized}
                              >
                                <Minus className="h-5 w-5" />
                              </Button>
                              <input
                                ref={(element) => {
                                  inputRefs.current[`candidate:${candidate.id}`] = element
                                }}
                                type="number"
                                min={0}
                                max={9999}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={votes}
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(event) => {
                                  updateCandidateVotes(candidate.id, normalizeNonNegativeInt(event.target.value), true)
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault()
                                    focusNextField(`candidate:${candidate.id}`)
                                  }
                                }}
                                className="h-12 w-full rounded-lg border border-border/60 bg-background px-3 text-center text-2xl font-bold tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                disabled={isCurrentMesaFinalized}
                                aria-label={`Votos de ${candidate.fullName}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="h-12 w-12 p-0"
                                onClick={() => incrementCandidate(candidate.id)}
                                disabled={isCurrentMesaFinalized}
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {groupedParties.length === 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  No hay candidatos cargados desde el sistema. Consulta con soporte.
                </div>
              )}

              <Card className="border-border/60 bg-card/90 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Votos especiales</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(Object.keys(SPECIAL_VOTE_LABELS) as SpecialVoteKey[]).map((type) => (
                    <div key={type} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <p className="text-sm font-semibold">{SPECIAL_VOTE_LABELS[type]}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 w-12 p-0"
                          onClick={() => decrementSpecial(type)}
                          disabled={isCurrentMesaFinalized}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <input
                          ref={(element) => {
                            inputRefs.current[`special:${type}`] = element
                          }}
                          type="number"
                          min={0}
                          max={9999}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={specialVotes[type]}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => {
                            updateSpecialVotes(type, normalizeNonNegativeInt(event.target.value), true)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              focusNextField(`special:${type}`)
                            }
                          }}
                          className="h-12 w-full rounded-lg border border-border/60 bg-background px-3 text-center text-2xl font-bold tracking-tight text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          disabled={isCurrentMesaFinalized}
                          aria-label={SPECIAL_VOTE_LABELS[type]}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 w-12 p-0"
                          onClick={() => incrementSpecial(type)}
                          disabled={isCurrentMesaFinalized}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 pb-16 lg:pb-0">
                <Button
                  size="lg"
                  className="h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                  onClick={goToPhoto}
                  disabled={isCurrentMesaFinalized}
                >
                  Continuar con foto E14 <ChevronRight className="h-5 w-5" />
                </Button>
                <Button variant="destructive" className="h-12 text-sm" onClick={cancelCurrentMesa}>
                  Cancelar registro de esta mesa
                </Button>
              </div>
            </div>

            <div className="hidden lg:block">
              <Card className="sticky top-24 border-border/60 bg-card/95 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Resumen de Mesa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total votos candidatos</span>
                    <span className="font-semibold">{totalVotosCandidatos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total votos en blanco</span>
                    <span className="font-semibold">{totalVotosBlanco}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total votos nulos</span>
                    <span className="font-semibold">{totalVotosNulos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total no marcados</span>
                    <span className="font-semibold">{totalVotosNoMarcados}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold">TOTAL GENERAL</span>
                    <span className={`font-bold ${warningOver ? "text-amber-300" : "text-emerald-300"}`}>
                      {totalGeneralVotos}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Votantes estimados: {mesaCapacity ?? "No disponible"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="fixed bottom-3 left-3 right-3 lg:hidden z-40">
              <Card className="border-border/60 bg-background/95 backdrop-blur shadow-lg">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Resumen de Mesa</span>
                    <span className={`text-lg font-bold ${warningOver ? "text-amber-300" : "text-emerald-300"}`}>
                      {totalGeneralVotos}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Candidatos {totalVotosCandidatos} · Blanco {totalVotosBlanco} · Nulos {totalVotosNulos} · No marcados {totalVotosNoMarcados}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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
                    {photos.map((photo, index) => (
                      <div
                        key={`${photo.preview}-${index}`}
                        className="relative rounded-xl overflow-hidden border border-border/60 bg-black/40"
                      >
                        <img src={photo.preview} alt={`E14 ${index + 1}`} className="w-full object-contain" />
                        <button
                          type="button"
                          className="absolute top-2 right-2 rounded-full bg-black/70 text-white p-1"
                          onClick={() => removePhoto(index)}
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
                <p className="text-sm font-semibold">
                  Sube fotos del E14 ({photos.length}/{maxPhotos})
                </p>
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

        {step === "confirm" && (
          <Card className="bg-card border-border/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleCheck className="h-5 w-5" />
                Paso 3 · Finalizar Mesa
              </CardTitle>
              <p className="text-sm text-muted-foreground">Confirma totales antes de enviar y bloquear edición.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mesa</span>
                  <span className="font-semibold">{currentMesa.label}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total candidatos</span>
                  <span className="font-semibold">{totalVotosCandidatos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voto en blanco</span>
                  <span className="font-semibold">{totalVotosBlanco}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Votos nulos</span>
                  <span className="font-semibold">{totalVotosNulos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Votos no marcados</span>
                  <span className="font-semibold">{totalVotosNoMarcados}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">TOTAL GENERAL</span>
                  <span className={`font-semibold ${warningOver ? "text-amber-300" : "text-emerald-400"}`}>
                    {totalGeneralVotos}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Foto E14</span>
                  <span className="font-semibold text-emerald-400">{photos.length} cargadas</span>
                </div>
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-muted-foreground">Nota rápida (hallazgos, incidencias)</label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="w-full rounded-lg border border-border/60 bg-background/70 p-3 text-sm focus:outline-none"
                    rows={2}
                    placeholder="Ej: Votante sin cédula reportado, jurado cambió a las 2pm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="h-14 text-lg bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                  onClick={handleConfirm}
                  disabled={savingState === "saving"}
                >
                  {savingState === "saving" && <Loader2 className="h-5 w-5 animate-spin" />}
                  Finalizar Mesa
                </Button>
                <Button size="lg" variant="outline" className="h-12" onClick={() => setStep("votos")}>
                  Volver a editar
                </Button>
                <Button variant="destructive" className="h-12 text-sm" onClick={cancelCurrentMesa}>
                  Cancelar registro de esta mesa
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card className="bg-card border-border/60 shadow-lg text-center">
            <CardHeader>
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <CardTitle className="text-xl">{currentMesa.label} finalizada</CardTitle>
                <p className="text-sm text-muted-foreground">Votos enviados y edición bloqueada.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary">Mesa cerrada correctamente</Badge>
              <Button
                size="lg"
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={goNextMesa}
                disabled={pendingCount === 0}
              >
                {pendingCount === 0 ? "No hay más mesas pendientes" : "Ir a siguiente mesa pendiente"}
              </Button>
              <div className="text-left space-y-2 pt-2">
                <p className="text-sm font-semibold">Mesas finalizadas</p>
                {completedMesas.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aún no hay mesas finalizadas.</p>
                )}
                <div className="space-y-2">
                  {completedMesas.map((mesa) => (
                    <div
                      key={mesa.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{mesa.label}</p>
                        <p className="text-xs text-muted-foreground">Total: {mesa.totalVotos}</p>
                        {mesa.note && <p className="text-xs text-muted-foreground truncate">Nota: {mesa.note}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Bloqueada
                      </Badge>
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
