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

const events = [
  {
    id: "EVT-2201",
    title: "Caravana Atlántico Norte",
    date: "2026-01-19",
    hour: "08:00",
    place: "Barranquilla - Bulevar",
    type: "movilización",
    attendance: 320,
    lead: "Coordinación logística",
    status: "confirmado",
  },
  {
    id: "EVT-2202",
    title: "Encuentro con líderes juveniles",
    date: "2026-01-20",
    hour: "16:00",
    place: "Soledad - Casa cultural",
    type: "formación",
    attendance: 110,
    lead: "Juventudes",
    status: "planificado",
  },
  {
    id: "EVT-2203",
    title: "Foro transparencia electoral",
    date: "2026-01-21",
    hour: "10:00",
    place: "Puerto Colombia - Auditorio",
    type: "institucional",
    attendance: 85,
    lead: "Equipo jurídico",
    status: "borrador",
  },
  {
    id: "EVT-2204",
    title: "Puerta a puerta sector 12",
    date: "2026-01-18",
    hour: "09:30",
    place: "Malambo",
    type: "territorial",
    attendance: 45,
    lead: "Líderes locales",
    status: "en curso",
  },
];

const statusColor: Record<string, string> = {
  confirmado: "bg-emerald-500/20 text-emerald-300",
  planificado: "bg-cyan-500/20 text-cyan-300",
  borrador: "bg-zinc-500/20 text-zinc-200",
  "en curso": "bg-amber-500/20 text-amber-300",
};

export default function EventosPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("todos");

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción simulada, pendiente de integración",
    });

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.place.toLowerCase().includes(search.toLowerCase());
      const matchesType = type === "todos" || e.type === type;
      return matchesSearch && matchesType;
    });
  }, [search, type]);

  const totals = useMemo(() => {
    const confirmados = events.filter((e) => e.status === "confirmado").length;
    const aforo = events.reduce((sum, e) => sum + e.attendance, 0);
    const proximo = events[0]?.date;
    return { total: events.length, confirmados, aforo, proximo };
  }, []);

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

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Agenda</span>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => notify("Nuevo evento")}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo evento
            </Button>
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
