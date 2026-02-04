"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  FileText,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Share2,
  Printer,
  Table,
  Map,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const coverageData = [
  { name: "Barranquilla", cobertura: 85, mesas: 450 },
  { name: "Soledad", cobertura: 72, mesas: 180 },
  { name: "Malambo", cobertura: 68, mesas: 95 },
  { name: "P. Colombia", cobertura: 90, mesas: 45 },
  { name: "Galapa", cobertura: 55, mesas: 38 },
];

const statusDistribution = [
  { name: "Con testigo", value: 680, color: "#10b981" },
  { name: "Sin testigo", value: 128, color: "#ef4444" },
  { name: "Pendiente", value: 42, color: "#f59e0b" },
];

const hourlyActivity = [
  { hour: "06:00", reportes: 12, alertas: 2 },
  { hour: "08:00", reportes: 45, alertas: 5 },
  { hour: "10:00", reportes: 78, alertas: 8 },
  { hour: "12:00", reportes: 120, alertas: 15 },
  { hour: "14:00", reportes: 95, alertas: 12 },
  { hour: "16:00", reportes: 150, alertas: 20 },
  { hour: "18:00", reportes: 85, alertas: 6 },
];

const reportTypes = [
  {
    id: "coverage",
    title: "Reporte de Cobertura",
    description: "Análisis detallado de cobertura por municipio y zona",
    icon: Map,
    color: "bg-cyan-500/20 text-cyan-400",
  },
  {
    id: "team",
    title: "Reporte de Equipo",
    description: "Rendimiento y actividad del equipo de campo",
    icon: Users,
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    id: "incidents",
    title: "Reporte de Incidentes",
    description: "Resumen de alertas e irregularidades reportadas",
    icon: AlertTriangle,
    color: "bg-red-500/20 text-red-400",
  },
  {
    id: "results",
    title: "Reporte de Resultados",
    description: "Consolidado de actas y resultados preliminares",
    icon: BarChart3,
    color: "bg-emerald-500/20 text-emerald-400",
  },
];

type VoteDetail = {
  candidateId: string
  fullName: string | null
  party: string | null
  position: string | null
  ballotNumber: number | null
  color: string | null
  votes: number
}

type VoteReportItem = {
  id: string
  pollingStation: string | null
  department: string | null
  municipality: string | null
  address: string | null
  totalVotes: number
  reportedAt: string | null
  notes: string | null
  details: VoteDetail[]
}

export default function ReportesPage() {
  const [dateRange, setDateRange] = useState("today");
  const [municipalityFilter, setMunicipalityFilter] = useState("all");
  const [voteReports, setVoteReports] = useState<VoteReportItem[]>([])
  const [loadingVotes, setLoadingVotes] = useState(false)
  const [votesError, setVotesError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadVotes = async () => {
      setLoadingVotes(true)
      setVotesError(null)
      try {
        const res = await fetch("/api/vote-reports", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudieron cargar los votos")
        const json = await res.json()
        if (cancelled) return
        setVoteReports(Array.isArray(json.items) ? json.items : [])
      } catch (err: any) {
        if (cancelled) return
        setVotesError(err?.message ?? "No se pudieron cargar los votos")
      } finally {
        if (!cancelled) setLoadingVotes(false)
      }
    }
    loadVotes()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredVotes = useMemo(() => {
    if (municipalityFilter === "all") return voteReports
    return voteReports.filter((r) => (r.municipality ?? "").toLowerCase().includes(municipalityFilter))
  }, [municipalityFilter, voteReports])

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción disponible próximamente."
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Centro de Reportes
          </h1>
          <p className="text-muted-foreground">
            Análisis y métricas de la operación electoral
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
            <SelectTrigger className="w-40 bg-zinc-800/50 border-zinc-700">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="barranquilla">Barranquilla</SelectItem>
              <SelectItem value="soledad">Soledad</SelectItem>
              <SelectItem value="malambo">Malambo</SelectItem>
              <SelectItem value="puerto-colombia">Puerto Colombia</SelectItem>
              <SelectItem value="galapa">Galapa</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="bg-transparent border-zinc-700"
            onClick={() => notify("Actualizar métricas")}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">680</p>
                <p className="text-xs text-muted-foreground">Mesas Cubiertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">79.5%</p>
                <p className="text-xs text-muted-foreground">Cobertura Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">68</p>
                <p className="text-xs text-muted-foreground">Alertas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">585</p>
                <p className="text-xs text-muted-foreground">Reportes Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Votos por mesa */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Votos por mesa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingVotes && (
            <p className="text-sm text-muted-foreground">Cargando votos...</p>
          )}
          {!loadingVotes && votesError && (
            <p className="text-sm text-destructive">{votesError}</p>
          )}
          {!loadingVotes && !votesError && filteredVotes.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay reportes de votos.</p>
          )}
          {!loadingVotes && !votesError && filteredVotes.map((report) => (
            <div key={report.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {report.pollingStation ?? "Mesa"} · {report.municipality ?? "Sin municipio"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {report.totalVotes} votos
                    {report.reportedAt ? ` · ${new Date(report.reportedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800/60 border-zinc-700"
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                >
                  {expandedId === report.id ? "Ocultar detalle" : "Ver detalle"}
                </Button>
              </div>

              {expandedId === report.id && (
                <div className="mt-3 grid gap-2">
                  {report.details.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin detalle por candidato.</p>
                  )}
                  {report.details.map((detail) => (
                    <div key={`${report.id}-${detail.candidateId}`} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{detail.fullName ?? "Candidato"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {detail.position ? detail.position : ""}
                          {detail.party ? ` · ${detail.party}` : ""}
                          {detail.ballotNumber ? ` · Tarjetón ${detail.ballotNumber}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{detail.votes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage by Municipality */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Cobertura por Municipio
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => notify("Descargar cobertura por municipio") }>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fafafa" }}
                  />
                  <Bar
                    dataKey="cobertura"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                    name="Cobertura %"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Distribución de Mesas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => notify("Descargar distribución de mesas") }>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Actividad por Hora
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => notify("Compartir actividad por hora") }>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => notify("Descargar actividad por hora") }>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="hour"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fafafa" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reportes"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ fill: "#06b6d4" }}
                  name="Reportes"
                />
                <Line
                  type="monotone"
                  dataKey="alertas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444" }}
                  name="Alertas"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Generar Reportes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group"
            >
              <CardContent className="p-6">
                <div
                  className={`p-3 rounded-lg ${report.color} w-fit mb-4 group-hover:scale-110 transition-transform`}
                >
                  <report.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {report.description}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent border-zinc-700"
                    onClick={() => notify(`Generar PDF: ${report.title}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent border-zinc-700"
                    onClick={() => notify(`Generar Excel: ${report.title}`)}
                  >
                    <Table className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Export Actions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Exportar Datos Completos
              </h3>
              <p className="text-sm text-muted-foreground">
                Descarga todos los datos de la jornada electoral en diferentes
                formatos
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="bg-transparent border-zinc-700"
                onClick={() => notify("Imprimir datos completos")}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-zinc-700"
                onClick={() => notify("Compartir datos completos")}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => notify("Exportar todo")}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Todo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
