"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, CheckCircle, AlertTriangle, MapPin, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type TaskItem = {
  id: string
  title: string
  owner: string
  place: string | null
  status: string
  priority: string
  progress: number
  due: string | null
}

const columns = [
  { key: "pendiente", title: "Pendiente", icon: Clock },
  { key: "en curso", title: "En curso", icon: AlertTriangle },
  { key: "listo", title: "Listo", icon: CheckCircle },
];

const priorityColor: Record<string, string> = {
  alta: "bg-red-500/15 text-red-400 border-red-500/40",
  media: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  baja: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export default function TareasPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    title: "",
    owner: "",
    place: "",
    priority: "media",
    status: "pendiente",
    progress: 0,
    due: "",
  })

  const grouped = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      items: tasks.filter((t) => t.status === col.key),
    }))
  }, [tasks])

  const createTask = () => {
    if (!form.title || !form.owner) {
      toast({ title: "Faltan datos", description: "Título y responsable son obligatorios" })
      return
    }
    const newTask: TaskItem = {
      id: `T-${Date.now()}`,
      title: form.title,
      owner: form.owner,
      place: form.place || null,
      status: form.status,
      priority: form.priority,
      progress: Number(form.progress) || 0,
      due: form.due || null,
    }
    setTasks((prev) => [newTask, ...prev])
    setOpen(false)
    setForm({ title: "", owner: "", place: "", priority: "media", status: "pendiente", progress: 0, due: "" })
    toast({ title: "Tarea creada", description: newTask.title })
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/tasks", { cache: "no-store" })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!active) return
        setTasks(data.items ?? [])
      } catch (err) {
        console.error(err)
        if (!active) return
        setError("No se pudieron cargar las tareas")
        setTasks([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Tareas</h1>
        <p className="text-sm text-muted-foreground">
          Tablero visual con tareas operativas. Diseño estático, sin cambios de modelo.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Badge className="bg-emerald-500/20 text-emerald-300">Entrega crítica</Badge>
          <Badge className="bg-cyan-500/20 text-cyan-300">En curso</Badge>
          <Badge className="bg-zinc-700/50 text-zinc-100">Backlog</Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" /> Nueva tarea
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Crear tarea</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Input
                placeholder="Título"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700"
              />
              <Input
                placeholder="Responsable"
                value={form.owner}
                onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700"
              />
              <Input
                placeholder="Lugar"
                value={form.place}
                onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
                className="bg-zinc-800/50 border-zinc-700"
              />
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
                    <SelectItem value="en curso">En curso</SelectItem>
                    <SelectItem value="listo">Listo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Progreso %"
                  value={form.progress}
                  onChange={(e) => setForm((p) => ({ ...p, progress: Number(e.target.value) }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
                <Input
                  placeholder="Vence (texto libre)"
                  value={form.due}
                  onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createTask} className="bg-cyan-600 hover:bg-cyan-700">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && (
          <Card className="bg-zinc-900/50 border-zinc-800 md:col-span-3">
            <CardContent className="p-4 text-sm text-muted-foreground">Cargando tareas...</CardContent>
          </Card>
        )}
        {error && !loading && (
          <Card className="bg-zinc-900/50 border-red-900/60 border md:col-span-3">
            <CardContent className="p-4 text-sm text-red-300">{error}</CardContent>
          </Card>
        )}
        {grouped.map((column) => (
          <Card key={column.key} className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <column.icon className="h-4 w-4" /> {column.title}
                </span>
                <Badge variant="outline" className="bg-zinc-800/70 border-zinc-700 text-xs">
                  {column.items.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[480px] pr-2">
                <div className="space-y-3">
                  {column.items.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{task.id}</p>
                        </div>
                        <Badge variant="outline" className={priorityColor[task.priority]}>
                          Prioridad {task.priority}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {task.owner}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {task.place}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.due}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progreso</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
