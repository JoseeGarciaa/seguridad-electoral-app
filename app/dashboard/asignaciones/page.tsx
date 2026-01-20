"use client";

import { useMemo, useState } from "react";
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

const assignments = [
  {
    id: "ASG-1024",
    title: "Cobertura mesas urbanas",
    assignee: "Carlos Mendoza",
    role: "Coordinador",
    municipality: "Barranquilla",
    zone: "Norte",
    due: "2026-01-20",
    priority: "alta",
    status: "en progreso",
    progress: 68,
    tasks: 34,
  },
  {
    id: "ASG-1025",
    title: "Relevo testigos jornada tarde",
    assignee: "Ana García",
    role: "Movilizadora",
    municipality: "Soledad",
    zone: "Centro",
    due: "2026-01-18",
    priority: "media",
    status: "pendiente",
    progress: 32,
    tasks: 18,
  },
  {
    id: "ASG-1026",
    title: "Reporte fotográfico cierres",
    assignee: "Juan Pérez",
    role: "Testigo",
    municipality: "Galapa",
    zone: "Oriental",
    due: "2026-01-19",
    priority: "alta",
    status: "en progreso",
    progress: 54,
    tasks: 22,
  },
  {
    id: "ASG-1027",
    title: "Logística transporte rural",
    assignee: "María Rodriguez",
    role: "Coordinadora",
    municipality: "Puerto Colombia",
    zone: "Costa",
    due: "2026-01-22",
    priority: "baja",
    status: "programado",
    progress: 12,
    tasks: 10,
  },
  {
    id: "ASG-1028",
    title: "Capacitación línea ética",
    assignee: "Pedro Martínez",
    role: "Líder de zona",
    municipality: "Malambo",
    zone: "Sur",
    due: "2026-01-21",
    priority: "media",
    status: "pendiente",
    progress: 0,
    tasks: 8,
  },
];

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

export default function AsignacionesPage() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("todas");
  const [status, setStatus] = useState("todas");

  const notify = (action: string) =>
    toast({
      title: "Acción de demostración",
      description: `${action} se habilitará con lógica real pronto`,
    });

  const filtered = useMemo(() => {
    return assignments.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.assignee.toLowerCase().includes(search.toLowerCase()) ||
        item.municipality.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priority === "todas" || item.priority === priority;
      const matchesStatus = status === "todas" || item.status === status;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [priority, search, status]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const pendientes = assignments.filter((a) => a.status === "pendiente").length;
    const progreso = assignments.filter((a) => a.status === "en progreso").length;
    const programadas = assignments.filter((a) => a.status === "programado").length;
    const avancePromedio = Math.round(
      assignments.reduce((sum, a) => sum + a.progress, 0) / total
    );
    return { total, pendientes, progreso, programadas, avancePromedio };
  }, []);

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

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</span>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => notify("Nueva asignación")}
            >
              <Plus className="h-4 w-4 mr-2" /> Nueva asignación
            </Button>
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
