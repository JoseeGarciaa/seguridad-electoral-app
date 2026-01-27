"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CheckCircle,
  MapPin,
  Users,
  Sparkles,
  Filter,
  Megaphone,
  Ticket,
  Plus,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type EventItem = {
  id: string
  title: string
  date: string | null
  hour: string | null
  place: string | null
  type: string
  attendance: number
  lead: string | null
  status: string
}

const statusColor: Record<string, string> = {
  confirmado: "bg-emerald-500/20 text-emerald-300",
  planificado: "bg-cyan-500/20 text-cyan-300",
  borrador: "bg-zinc-500/20 text-zinc-200",
  "en curso": "bg-amber-500/20 text-amber-300",
};

export default function EventosPage() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("todos")
  const [items, setItems] = useState<EventItem[]>([])
  const [totals, setTotals] = useState({ total: 0, confirmados: 0, aforo: 0, proximo: null as string | null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    place: "",
    type: "movilización",
    attendance: 0,
    lead: "",
    date: "",
    hour: "",
  })

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción conectada a backend próximamente",
    })

  const addEvent = () => {
    if (!form.title) {
      toast({ title: "Falta título", description: "Agrega un nombre al evento" })
      return
    }
    const newEvent: EventItem = {
      id: `EV-${Date.now()}`,
      title: form.title,
      date: form.date || null,
      hour: form.hour || null,
      place: form.place || null,
      type: form.type,
      attendance: Number(form.attendance) || 0,
      lead: form.lead || null,
      status: "planificado",
    }
    const nextItems = [newEvent, ...items]
    setItems(nextItems)
    setTotals({
      total: nextItems.length,
      confirmados: nextItems.filter((e) => e.status === "confirmado").length,
      aforo: nextItems.reduce((acc, e) => acc + (e.attendance || 0), 0),
      proximo: nextItems.find((e) => e.date)?.date || null,
    })
    setOpen(false)
    setForm({ title: "", place: "", type: "movilización", attendance: 0, lead: "", date: "", hour: "" })
    toast({ title: "Evento creado", description: newEvent.title })
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/events", { cache: "no-store" })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!active) return
        setItems(data.items ?? [])
        setTotals({
          total: data.stats?.total ?? 0,
          confirmados: data.stats?.confirmados ?? 0,
          aforo: data.stats?.aforo ?? 0,
          proximo: data.stats?.proximo ?? null,
        })
      } catch (err) {
        console.error(err)
        if (!active) return
        setError("No se pudieron cargar eventos")
        setItems([])
        setTotals({ total: 0, confirmados: 0, aforo: 0, proximo: null })
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((e) => {
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.place ?? "").toLowerCase().includes(q)
      const matchesType = type === "todos" || e.type === type
      return matchesSearch && matchesType
    })
  }, [items, search, type])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Planeación de eventos y acciones territoriales. Solo UI, sin tocar modelo actual.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Calendar className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.total}</p>
                <p className="text-xs text-muted-foreground">Eventos activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.confirmados}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.aforo}</p>
                <p className="text-xs text-muted-foreground">Aforo estimado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totals.proximo}</p>
                <p className="text-xs text-muted-foreground">Próximo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-sm text-muted-foreground">Cargando eventos...</CardContent>
        </Card>
      )}
      {error && !loading && (
        <Card className="bg-zinc-900/50 border-red-900/60 border">
          <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Agenda</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" /> Nuevo evento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Registrar evento</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input
                    placeholder="Título"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <Input
                    placeholder="Lugar"
                    value={form.place}
                    onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      type="time"
                      value={form.hour}
                      onChange={(e) => setForm((p) => ({ ...p, hour: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movilización">Movilización</SelectItem>
                        <SelectItem value="formación">Formación</SelectItem>
                        <SelectItem value="territorial">Territorial</SelectItem>
                        <SelectItem value="institucional">Institucional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Aforo estimado"
                      value={form.attendance}
                      onChange={(e) => setForm((p) => ({ ...p, attendance: Number(e.target.value) }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <Input
                    placeholder="Responsable"
                    value={form.lead}
                    onChange={(e) => setForm((p) => ({ ...p, lead: e.target.value }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={addEvent} className="bg-cyan-600 hover:bg-cyan-700">Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por nombre o lugar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 md:col-span-2"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="movilización">Movilización</SelectItem>
              <SelectItem value="formación">Formación</SelectItem>
              <SelectItem value="territorial">Territorial</SelectItem>
              <SelectItem value="institucional">Institucional</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <Badge className={statusColor[event.status]}>{event.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.id} · Lidera {event.lead}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {event.date} · {event.hour}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.place}</span>
                    <span className="flex items-center gap-1"><Ticket className="h-3 w-3" /> Tipo: {event.type}</span>
                  </div>
                </div>
                <div className="text-right min-w-[140px]">
                  <p className="text-xs text-muted-foreground">Aforo estimado</p>
                  <p className="text-xl font-semibold text-foreground">{event.attendance}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-zinc-800/40 border-zinc-700"
              onClick={() => notify("Convocar voluntarios")}
            >
              <Megaphone className="h-4 w-4 mr-2" /> Convocar voluntarios
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-zinc-800/40 border-zinc-700"
              onClick={() => notify("Asignar responsables")}
            >
              <Users className="h-4 w-4 mr-2" /> Asignar responsables
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-zinc-800/40 border-zinc-700"
              onClick={() => notify("Publicar invitación")}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Publicar invitación
            </Button>
            <p className="text-xs text-muted-foreground">
              Estas acciones son solo de diseño y no modifican datos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
