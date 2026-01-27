"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  MapPin,
  Plus,
  Target,
  Users,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type AssignmentItem = {
  id: string
  title: string
  assignee: string
  role?: string
  municipality: string
  zone: string
  due: string | null
  priority: string
  status: string
  progress: number
  tasks: number
}

const priorityColor: Record<string, string> = {
  alta: "bg-red-500/15 text-red-400 border-red-500/30",
  media: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  baja: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const statusColor: Record<string, string> = {
  pendiente: "bg-zinc-500/20 text-zinc-200",
  "en progreso": "bg-cyan-500/20 text-cyan-300",
  programado: "bg-purple-500/20 text-purple-300",
  completado: "bg-emerald-500/20 text-emerald-300",
};

export default function AsignacionesClientPage() {
  const [search, setSearch] = useState("")
  const [priority, setPriority] = useState("todas")
  const [status, setStatus] = useState("todas")
  const [items, setItems] = useState<AssignmentItem[]>([])
  const [stats, setStats] = useState({ total: 0, pendientes: 0, progreso: 0, programadas: 0, avancePromedio: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    assignee: "",
    role: "",
    municipality: "",
    zone: "",
    due: "",
    priority: "media",
    status: "pendiente",
    progress: 0,
    tasks: 0,
  })

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción conectada a backend próximamente",
    })

  const recalcStats = (list: AssignmentItem[]) => {
    const total = list.length
    const pendientes = list.filter((i) => i.status === "pendiente").length
    const progreso = list.filter((i) => i.status === "en progreso").length
    const programadas = list.filter((i) => i.status === "programado").length
    const avancePromedio = total === 0 ? 0 : Math.round(list.reduce((acc, i) => acc + (i.progress || 0), 0) / total)
    setStats({ total, pendientes, progreso, programadas, avancePromedio })
  }

  const addAssignment = () => {
    if (!form.title || !form.assignee) {
      toast({ title: "Faltan datos", description: "Título y responsable son obligatorios" })
      return
    }
    const newItem: AssignmentItem = {
      id: `ASG-${Date.now()}`,
      title: form.title,
      assignee: form.assignee,
      role: form.role || undefined,
      municipality: form.municipality || "",
      zone: form.zone || "",
      due: form.due || null,
      priority: form.priority,
      status: form.status,
      progress: Number(form.progress) || 0,
      tasks: Number(form.tasks) || 0,
    }
    const next = [newItem, ...items]
    setItems(next)
    recalcStats(next)
    setOpen(false)
    setForm({ title: "", assignee: "", role: "", municipality: "", zone: "", due: "", priority: "media", status: "pendiente", progress: 0, tasks: 0 })
    toast({ title: "Asignación creada", description: newItem.title })
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/assignments", { cache: "no-store" })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!active) return
        setItems(data.items ?? [])
        setStats(data.stats ?? stats)
      } catch (err) {
        console.error(err)
        if (!active) return
        setError("No se pudieron cargar las asignaciones")
        setItems([])
        setStats({ total: 0, pendientes: 0, progreso: 0, programadas: 0, avancePromedio: 0 })
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
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.assignee ?? "").toLowerCase().includes(q) ||
        (item.municipality ?? "").toLowerCase().includes(q)
      const matchesPriority = priority === "todas" || item.priority === priority
      const matchesStatus = status === "todas" || item.status === status
      return matchesSearch && matchesPriority && matchesStatus
    })
  }, [items, priority, search, status])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Asignaciones</h1>
        <p className="text-sm text-muted-foreground">
          Controla asignaciones operativas sin modificar el modelo de datos. Solo UI.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Target className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Asignaciones</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.pendientes}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.progreso}</p>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.programadas}</p>
                <p className="text-xs text-muted-foreground">Programadas</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.avancePromedio}%</p>
                <p className="text-xs text-muted-foreground">Avance promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4 text-sm text-muted-foreground">Cargando asignaciones...</CardContent>
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
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</span>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" /> Nueva asignación
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Crear asignación</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <Input
                    placeholder="Título"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Responsable"
                      value={form.assignee}
                      onChange={(e) => setForm((p) => ({ ...p, assignee: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      placeholder="Rol"
                      value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Municipio"
                      value={form.municipality}
                      onChange={(e) => setForm((p) => ({ ...p, municipality: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      placeholder="Zona"
                      value={form.zone}
                      onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Vence (texto)"
                      value={form.due}
                      onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Progreso %"
                      value={form.progress}
                      onChange={(e) => setForm((p) => ({ ...p, progress: Number(e.target.value) }))}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en progreso">En progreso</SelectItem>
                        <SelectItem value="programado">Programado</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Actividades vinculadas"
                    value={form.tasks}
                    onChange={(e) => setForm((p) => ({ ...p, tasks: Number(e.target.value) }))}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={addAssignment} className="bg-cyan-600 hover:bg-cyan-700">Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="gap-3 grid grid-cols-1 md:grid-cols-4">
          <Input
            placeholder="Buscar por persona, zona o municipio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 col-span-2"
          />
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las prioridades</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="baja">Baja</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en progreso">En progreso</SelectItem>
              <SelectItem value="programado">Programado</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <Card key={item.id} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{item.id}</p>
                  <CardTitle className="text-lg text-foreground leading-tight">
                    {item.title}
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className={priorityColor[item.priority]}>Prioridad {item.priority}</Badge>
                  <Badge className={statusColor[item.status]}> {item.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{item.assignee} · {item.role}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{item.municipality} · Zona {item.zone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Vence {item.due}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{item.tasks} actividades vinculadas</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
