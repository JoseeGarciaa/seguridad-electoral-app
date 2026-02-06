"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CumplimientoPage() {
  const [summary, setSummary] = useState({ assigned: 0, reported: 0, missing: 0, coveragePct: 0 })
  const [items, setItems] = useState<
    Array<{
      id: string
      name: string
      email: string
      municipality: string | null
      assigned: number
      reported: number
      missing: number
      lastReportedAt: string | null
    }>
  >([])
  const [viewerRole, setViewerRole] = useState<string | null>(null)

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
        setItems(Array.isArray(json?.items) ? json.items : [])
        setViewerRole(json?.viewerRole ?? null)
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

  const isAdmin = viewerRole === "admin"

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



      {isAdmin && (
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Delegados y mesas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin delegados con mesas asignadas.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delegado</TableHead>
                    <TableHead>Municipio</TableHead>
                    <TableHead>Asignadas</TableHead>
                    <TableHead>Reportadas</TableHead>
                    <TableHead>Faltantes</TableHead>
                    <TableHead>Cobertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const pct = item.assigned === 0 ? 0 : Math.round((item.reported / item.assigned) * 100)
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="min-w-[180px]">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.municipality ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{item.assigned}</TableCell>
                        <TableCell className="text-sm text-foreground">{item.reported}</TableCell>
                        <TableCell>
                          <Badge className="bg-amber-500/20 text-amber-200">{item.missing}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{pct}%</span>
                              <span className="text-muted-foreground">
                                {item.reported}/{item.assigned}
                              </span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
