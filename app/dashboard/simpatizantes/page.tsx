"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Heart,
  CheckCircle,
  MapPin,
  UserPlus,
  Phone,
  Mail,
  Filter,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const supporters = [
  {
    id: "SPT-3412",
    name: "Luisa Fernández",
    municipality: "Barranquilla",
    zone: "Norte",
    phone: "+57 300 234 8899",
    email: "luisa.fernandez@example.com",
    commitment: 92,
    status: "confirmado",
    channel: "Puerta a puerta",
  },
  {
    id: "SPT-3413",
    name: "Ricardo Gómez",
    municipality: "Soledad",
    zone: "Centro",
    phone: "+57 301 556 1899",
    email: "ricardo.gomez@example.com",
    commitment: 75,
    status: "activo",
    channel: "Digital",
  },
  {
    id: "SPT-3414",
    name: "Andrea Ríos",
    municipality: "Malambo",
    zone: "Sur",
    phone: "+57 302 110 7788",
    email: "andrea.rios@example.com",
    commitment: 61,
    status: "en validación",
    channel: "Evento",
  },
  {
    id: "SPT-3415",
    name: "Luis Pérez",
    municipality: "Galapa",
    zone: "Oriental",
    phone: "+57 303 909 9988",
    email: "luis.perez@example.com",
    commitment: 48,
    status: "contactar",
    channel: "Referido",
  },
  {
    id: "SPT-3416",
    name: "Marta Navarro",
    municipality: "Puerto Colombia",
    zone: "Costa",
    phone: "+57 304 778 6655",
    email: "marta.navarro@example.com",
    commitment: 83,
    status: "confirmado",
    channel: "Digital",
  },
];

const statusColor: Record<string, string> = {
  confirmado: "bg-emerald-500/20 text-emerald-300",
  activo: "bg-cyan-500/20 text-cyan-300",
  "en validación": "bg-amber-500/20 text-amber-300",
  contactar: "bg-zinc-500/20 text-zinc-200",
};

export default function SimpatizantesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [municipality, setMunicipality] = useState("todos");

  const notify = () =>
    toast({
      title: "Registrar simpatizante",
      description: "Acción en modo demo; integración pendiente",
    });

  const filtered = useMemo(() => {
    return supporters.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        s.municipality.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "todos" || s.status === status;
      const matchesMunicipality =
        municipality === "todos" || s.municipality.toLowerCase() === municipality;
      return matchesSearch && matchesStatus && matchesMunicipality;
    });
  }, [municipality, search, status]);

  const stats = useMemo(() => {
    const total = supporters.length;
    const confirmados = supporters.filter((s) => s.status === "confirmado").length;
    const activos = supporters.filter((s) => s.status === "activo").length;
    const porValidar = supporters.filter((s) => s.status === "en validación").length;
    return { total, confirmados, activos, porValidar };
  }, []);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Simpatizantes</h1>
        <p className="text-sm text-muted-foreground">
          Segmenta y visualiza el avance de simpatizantes registrados. Datos mock, solo visual.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Heart className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.confirmados}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.activos}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.porValidar}</p>
                <p className="text-xs text-muted-foreground">En validación</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Segmentación</span>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={notify}>
              <UserPlus className="h-4 w-4 mr-2" /> Registrar simpatizante
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Buscar por nombre, email o municipio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 col-span-2"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="en validación">En validación</SelectItem>
              <SelectItem value="contactar">Contactar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={municipality} onValueChange={setMunicipality}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Municipio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="barranquilla">Barranquilla</SelectItem>
              <SelectItem value="soledad">Soledad</SelectItem>
              <SelectItem value="malambo">Malambo</SelectItem>
              <SelectItem value="galapa">Galapa</SelectItem>
              <SelectItem value="puerto colombia">Puerto Colombia</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Listado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <Badge className={statusColor[s.status]}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.id} · Canal: {s.channel}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.municipality} · Zona {s.zone}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>
                  </div>
                </div>
                <div className="min-w-[180px]">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Compromiso</span>
                    <span>{s.commitment}%</span>
                  </div>
                  <Progress value={s.commitment} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Embudo de compromiso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Contacto", "Interés", "Validación", "Confirmado"].map((stage, index) => {
              const progress = [100, 82, 64, 46][index];
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{stage}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground">
              Cifras simuladas para diseño. No altera el modelo actual.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
