"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, Target, TrendingUp, Shield, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const milestones = [
  {
    title: "Cierre de capacitación",
    date: "20 Ene",
    progress: 75,
    tag: "Formación",
  },
  {
    title: "Revisión de evidencias",
    date: "21 Ene",
    progress: 52,
    tag: "Control",
  },
  {
    title: "Entrega de kits",
    date: "22 Ene",
    progress: 64,
    tag: "Logística",
  },
];

export default function CumplimientoPage() {
  const [summary, setSummary] = useState({ assigned: 0, reported: 0, missing: 0, coveragePct: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/compliance", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudo cargar cumplimiento")
        const json = await res.json()
        if (cancelled) return
        const next = json?.summary ?? {}
        setSummary({
          assigned: Number(next.assigned ?? 0),
          reported: Number(next.reported ?? 0),
          missing: Number(next.missing ?? 0),
          coveragePct: Number(next.coveragePct ?? 0),
        })
      } catch (err: any) {
        console.error(err)
        toast({ title: "Cumplimiento", description: err?.message ?? "No se pudo cargar" })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const coverageProgress = summary.assigned === 0 ? 0 : Math.round((summary.reported / summary.assigned) * 100)
  const missingProgress = summary.assigned === 0 ? 0 : Math.round((summary.missing / summary.assigned) * 100)

  const kpis = useMemo(() => [
    {
      title: "Cobertura de mesas",
      value: `${summary.coveragePct}%`,
      target: "100%",
      progress: coverageProgress,
      detail: `${summary.reported} reportadas de ${summary.assigned}`,
    },
    {
      title: "Mesas reportadas",
      value: `${summary.reported}`,
      target: `${summary.assigned}`,
      progress: coverageProgress,
      detail: "Reportes enviados por testigos",
    },
    {
      title: "Mesas faltantes",
      value: `${summary.missing}`,
      target: "0",
      progress: missingProgress,
      detail: "Pendientes por reportar",
    },
  ], [summary.assigned, summary.coveragePct, summary.missing, summary.reported, coverageProgress, missingProgress])

  const notify = () =>
    toast({
      title: "Registrar avance",
      description: "Acción pendiente de integración",
    });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Cumplimiento</h1>
        <p className="text-sm text-muted-foreground">
          Seguimiento visual a KPIs operativos basados en mesas asignadas y reportadas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" /> {kpi.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground text-xl font-semibold">{kpi.value}</span>
                <Badge className="bg-zinc-800/70 border-zinc-700 text-xs">Meta {kpi.target}</Badge>
              </div>
              <Progress value={kpi.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{kpi.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Hitos y entregables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((milestone) => (
              <div
                key={milestone.title}
                className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-200">{milestone.tag}</Badge>
                    <p className="text-sm font-medium text-foreground">{milestone.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {milestone.date}
                  </div>
                </div>
                <Progress value={milestone.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">Avance {milestone.progress}%</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Checklist de control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {["Protocolos firmados", "Kits entregados", "Testigos acreditados"].map((item, i) => {
              const percent = [88, 64, 72][i];
              return (
                <div key={item} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-foreground">
                    <span>{item}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-200">{percent}%</Badge>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              );
            })}
            <Button
              variant="outline"
              className="w-full bg-zinc-800/50 border-zinc-700"
              onClick={notify}
            >
              <CheckCircle className="h-4 w-4 mr-2" /> Registrar avance (UI)
            </Button>
            <p className="text-xs text-muted-foreground">
              Elementos ilustrativos; no se persiste información.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
