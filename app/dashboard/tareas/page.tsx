"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Clock, CheckCircle, AlertTriangle, MapPin, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const tasks = [
  {
    id: "TSK-4501",
    title: "Validar actas de cierre zona norte",
    owner: "Equipo jurídico",
    place: "Barranquilla",
    status: "pendiente",
    priority: "alta",
    progress: 12,
    due: "Hoy 18:00",
  },
  {
    id: "TSK-4502",
    title: "Confirmar transporte testigos",
    owner: "Logística",
    place: "Soledad",
    status: "en curso",
    priority: "media",
    progress: 54,
    due: "Mañana",
  },
  {
    id: "TSK-4503",
    title: "Publicar resumen de incidencias",
    owner: "Comunicaciones",
    place: "Canales digitales",
    status: "en curso",
    priority: "alta",
    progress: 73,
    due: "Hoy 17:00",
  },
  {
    id: "TSK-4504",
    title: "Capacitar equipo rural",
    owner: "Formación",
    place: "Malambo",
    status: "pendiente",
    priority: "media",
    progress: 0,
    due: "21 Ene",
  },
  {
    id: "TSK-4505",
    title: "Cargar evidencia multimedia",
    owner: "Operaciones",
    place: "Puerto Colombia",
    status: "listo",
    priority: "baja",
    progress: 100,
    due: "Completado",
  },
];

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
  const grouped = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      items: tasks.filter((t) => t.status === col.key),
    }));
  }, []);

  const notify = () =>
    toast({
      title: "Nueva tarea",
      description: "Función de creación pendiente de integrar",
    });

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
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={notify}>
          <Plus className="h-4 w-4 mr-2" /> Nueva tarea
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
