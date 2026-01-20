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
  AlertTriangle,
  Bell,
  CheckCircle,
  MapPin,
  Shield,
  Clock,
  Filter,
  Activity,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const alerts = [
  {
    id: "ALR-8801",
    title: "Posible compra de votos",
    level: "crítica",
    category: "irregularidad",
    municipality: "Soledad",
    time: "Hace 6 min",
    status: "en análisis",
    detail: "Se reporta entrega de bonos a la salida del puesto 012.",
  },
  {
    id: "ALR-8802",
    title: "Acta ilegible",
    level: "media",
    category: "documental",
    municipality: "Barranquilla",
    time: "Hace 14 min",
    status: "abierta",
    detail: "Acta mesa 045 presenta manchas y tachones.",
  },
  {
    id: "ALR-8803",
    title: "Ausencia de jurados",
    level: "alta",
    category: "operativa",
    municipality: "Malambo",
    time: "Hace 22 min",
    status: "enviada",
    detail: "Solo 2 jurados en mesa 033, se requiere relevo.",
  },
  {
    id: "ALR-8804",
    title: "Manifestación cercana",
    level: "media",
    category: "orden público",
    municipality: "Galapa",
    time: "Hace 30 min",
    status: "abierta",
    detail: "Marcha a 200m del puesto 018, sin afectación por ahora.",
  },
];

const levelColor: Record<string, string> = {
  crítica: "bg-red-500/20 text-red-300",
  alta: "bg-amber-500/20 text-amber-300",
  media: "bg-cyan-500/20 text-cyan-300",
};

const statusColor: Record<string, string> = {
  abierta: "bg-zinc-500/20 text-zinc-100",
  "en análisis": "bg-purple-500/20 text-purple-200",
  enviada: "bg-emerald-500/20 text-emerald-200",
};

export default function AlertasPage() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("todas");

  const notify = (action: string) =>
    toast({
      title: "Acción de demostración",
      description: `${action} se conectará a flujo real próximamente`,
    });

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.municipality.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = level === "todas" || a.level === level;
      return matchesSearch && matchesLevel;
    });
  }, [level, search]);

  const stats = useMemo(() => {
    const criticas = alerts.filter((a) => a.level === "crítica").length;
    const abiertas = alerts.filter((a) => a.status === "abierta").length;
    return { total: alerts.length, criticas, abiertas };
  }, []);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Panel de alertas y trazabilidad visual. No modifica el modelo actual.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Bell className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Alertas totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.criticas}</p>
                <p className="text-xs text-muted-foreground">Críticas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.abiertas}</p>
                <p className="text-xs text-muted-foreground">Abiertas</p>
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
                <p className="text-2xl font-bold text-foreground">12</p>
                <p className="text-xs text-muted-foreground">Resueltas (mock)</p>
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
              onClick={() => notify("Agregar alerta")}
            >
              Agregar alerta (UI)
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Buscar por título o municipio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700 md:col-span-2"
          />
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="crítica">Crítica</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="media">Media</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Cronología</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((alert) => (
              <div key={alert.id} className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className={levelColor[alert.level]}>{alert.level}</Badge>
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  </div>
                  <Badge className={statusColor[alert.status]}>{alert.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alert.id} · {alert.category}</p>
                <p className="text-sm text-foreground">{alert.detail}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {alert.municipality}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {alert.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base">Indicadores rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Recepción", "Análisis", "Escalamiento"].map((label, i) => {
              const value = [76, 54, 23][i];
              const total = [90, 80, 60][i];
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-foreground">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{value}/{total}</span>
                  </div>
                  <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${Math.min(100, Math.round((value / total) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 text-xs text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Diseño de métricas ilustrativas sin impacto en datos.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
