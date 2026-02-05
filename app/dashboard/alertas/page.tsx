"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type AlertItem = {
  id: string
  title: string
  level: "crítica" | "alta" | "media"
  category: string
  municipality: string
  time: string
  status: "abierta" | "en análisis" | "enviada"
  detail: string
}

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
  const [data, setData] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState("todas")
  const [stats, setStats] = useState({ total: 0, criticas: 0, abiertas: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/alerts", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudo cargar alertas")
        const json = await res.json()
        if (cancelled) return

        const items: AlertItem[] = Array.isArray(json.items) ? json.items : []
        setData(items)
        setStats({
          total: Number(json.stats?.total ?? items.length),
          criticas: Number(json.stats?.criticas ?? 0),
          abiertas: Number(json.stats?.abiertas ?? 0),
        })
      } catch (err: any) {
        console.error(err)
        toast({ title: "Alertas", description: err?.message ?? "No se pudo cargar" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return data.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.municipality.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = level === "todas" || a.level === level;
      return matchesSearch && matchesLevel;
    });
  }, [data, level, search]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Alertas generadas por reportes de votos enviados por los testigos.
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
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Resueltas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Buscar por nombre o municipio"
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

      <div className="space-y-4">
        {loading && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-sm text-muted-foreground">Cargando alertas...</CardContent>
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 text-sm text-muted-foreground">Sin alertas de incumplimiento.</CardContent>
          </Card>
        )}
        {!loading && filtered.map((alerta) => (
          <Card key={alerta.id} className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{alerta.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {alerta.municipality}
                    <Clock className="h-3 w-3" /> {alerta.time}
                  </div>
                </div>
                <Badge className={levelColor[alerta.level] ?? "bg-zinc-700"}>{alerta.level}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{alerta.detail}</p>
              <div className="flex items-center justify-between text-xs">
                <Badge className="bg-zinc-800/80 border-zinc-700">{alerta.category}</Badge>
                <Badge className={statusColor[alerta.status] ?? "bg-zinc-700"}>{alerta.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
