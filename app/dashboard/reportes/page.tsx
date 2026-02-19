"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

type VoteDetail = {
  candidateId: string;
  fullName: string | null;
  party: string | null;
  position: string | null;
  ballotNumber: number | null;
  votes: number;
};

type VoteReportItem = {
  id: string;
  delegateName?: string | null;
  tableNumber?: number | null;
  pollingStation: string | null;
  municipality: string | null;
  totalVotes: number;
  reportedAt: string | null;
  details: VoteDetail[];
  officialComparison?: {
    totalReported: number;
    totalOficial: number | null;
    votantes: number | null;
    expectedMin: number | null;
    expectedMax: number | null;
    diferencia: number | null;
    participacion: number | null;
    overVoting: boolean;
    mismatch: boolean;
    increaseAlert: boolean;
    decreaseAlert: boolean;
    outOfExpectedRange: boolean;
    hasOfficialData: boolean;
    officialNotice: string | null;
  };
};

const REPORTS_CLIENT_CACHE_TTL_MS = 20_000;
let reportsClientCache: {
  ts: number;
  items: VoteReportItem[];
  viewerRole: string | null;
} | null = null;

export default function ReportesPage() {
  const searchParams = useSearchParams();
  const [voteReports, setVoteReports] = useState<VoteReportItem[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [votesError, setVotesError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const canExportData = viewerRole === "admin";

  useEffect(() => {
    const targetReportId = searchParams.get("reportId");
    if (!targetReportId) return;
    if (!voteReports.some((report) => report.id === targetReportId)) return;

    setExpandedId(targetReportId);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const element = document.getElementById(`reporte-${targetReportId}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [searchParams, voteReports]);

  useEffect(() => {
    let cancelled = false;

    if (reportsClientCache && Date.now() - reportsClientCache.ts < REPORTS_CLIENT_CACHE_TTL_MS) {
      setVoteReports(reportsClientCache.items);
      setViewerRole(reportsClientCache.viewerRole);
      setLoadingVotes(false);
      return () => {
        cancelled = true;
      };
    }

    const loadVotes = async () => {
      setLoadingVotes(true);
      setVotesError(null);
      try {
        const res = await fetch("/api/vote-reports");
        if (!res.ok) throw new Error("No se pudieron cargar los votos");
        const json = await res.json();
        if (cancelled) return;
        const nextItems = Array.isArray(json.items) ? json.items : [];
        const nextViewerRole = typeof json.viewerRole === "string" ? json.viewerRole : null;
        reportsClientCache = {
          ts: Date.now(),
          items: nextItems,
          viewerRole: nextViewerRole,
        };
        setVoteReports(nextItems);
        setViewerRole(nextViewerRole);
      } catch (err: any) {
        if (cancelled) return;
        setVotesError(err?.message ?? "No se pudieron cargar los votos");
      } finally {
        if (!cancelled) setLoadingVotes(false);
      }
    };

    loadVotes();
    return () => {
      cancelled = true;
    };
  }, []);

  const notify = (action: string) =>
    toast({
      title: action,
      description: "Acción disponible próximamente.",
    });

  const formatReportDate = (value: string | null) => {
    if (!value) return "";
    return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const exportReports = (reports: VoteReportItem[], filePrefix: string, toastTitle: string) => {
    if (!canExportData || reports.length === 0) return;
    try {
      import("xlsx").then((XLSX) => {
        const resolveAlertText = (report: VoteReportItem) => {
          if (!report.officialComparison?.hasOfficialData) {
            return report.officialComparison?.officialNotice ?? "Sin información oficial histórica para el puesto y mesa reportados.";
          }
          if (report.officialComparison.overVoting && report.officialComparison.increaseAlert) {
            return "Sobrevotación e incremento fuera de rango";
          }
          if (report.officialComparison.overVoting && report.officialComparison.decreaseAlert) {
            return "Sobrevotación y disminución fuera de rango";
          }
          if (report.officialComparison.increaseAlert) {
            return "Incremento de votación fuera de rango";
          }
          if (report.officialComparison.decreaseAlert) {
            return "Disminución de votación fuera de rango";
          }
          if (report.officialComparison.mismatch) {
            return "Descuadre dentro de tolerancia";
          }
          return "Sin alertas";
        };

        const summaryRows = reports.map((report) => ({
          "ID Reporte": report.id,
          "Delegado": report.delegateName ?? "",
          "Puesto": report.pollingStation ?? "",
          "Mesa": report.tableNumber ?? "",
          "Municipio": report.municipality ?? "",
          "Total Votos": report.totalVotes,
          "Fecha Reporte": formatReportDate(report.reportedAt),
          "Total oficial": report.officialComparison?.totalOficial ?? "N/D",
          "Total reportado": report.officialComparison?.totalReported ?? report.totalVotes,
          "Diferencia": report.officialComparison?.diferencia ?? "N/D",
          "Rango esperado mínimo": report.officialComparison?.expectedMin ?? "N/D",
          "Rango esperado máximo": report.officialComparison?.expectedMax ?? "N/D",
          "Participación (%)":
            report.officialComparison?.participacion !== null && report.officialComparison?.participacion !== undefined
              ? report.officialComparison.participacion
              : "N/D",
          "Alerta mesa": resolveAlertText(report),
        }));

        const detailRows = reports.flatMap((report) =>
          report.details.map((detail) => ({
            "ID Reporte": report.id,
            "Delegado": report.delegateName ?? "",
            "Puesto": report.pollingStation ?? "",
            "Mesa": report.tableNumber ?? "",
            "Municipio": report.municipality ?? "",
            "Candidato": detail.fullName ?? "",
            "Cargo": detail.position ?? "",
            "Partido": detail.party ?? "",
            "Tarjetón": detail.ballotNumber ?? "",
            "Votos": detail.votes,
          })),
        );

        const workbook = XLSX.utils.book_new();
        const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
        const detailSheet = XLSX.utils.json_to_sheet(detailRows);

        XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
        XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        XLSX.writeFile(workbook, `${filePrefix}-${timestamp}.xlsx`);
        toast({ title: toastTitle, description: "Archivo Excel generado correctamente" });
      }).catch((error) => {
        console.error(error);
        toast({ title: toastTitle, description: "No se pudo generar el archivo Excel" });
      });
    } catch (error) {
      console.error(error);
      toast({ title: toastTitle, description: "No se pudo exportar la información" });
    }
  };

  const printReports = (reports: VoteReportItem[], title: string) => {
    if (!canExportData || reports.length === 0) return;
    if (typeof window === "undefined") return;

    const body = reports
      .map((report) => {
        const details = report.details.length
          ? `<ul>${report.details
              .map(
                (detail) =>
                  `<li>${escapeHtml(detail.fullName ?? "Candidato")} · ${escapeHtml(detail.position ?? "Sin cargo")} · ${escapeHtml(detail.party ?? "Sin partido")}${detail.ballotNumber ? ` · Tarjetón ${detail.ballotNumber}` : ""} · ${detail.votes} votos</li>`,
              )
              .join("")}</ul>`
          : "<p>Sin detalle por candidato.</p>";

        const official = report.officialComparison;
        const officialBlock = !official
          ? ""
          : `
            <div style="margin:10px 0 10px 0;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa;">
              <h4 style="margin:0 0 8px 0;">Datos oficiales mesa</h4>
              <p style="margin:0 0 4px 0;">Total oficial: ${official.totalOficial ?? "N/D"}</p>
              <p style="margin:0 0 4px 0;">Total reportado: ${official.totalReported ?? report.totalVotes}</p>
              <p style="margin:0 0 4px 0;">Diferencia: ${official.diferencia ?? "N/D"}</p>
              <p style="margin:0 0 4px 0;">Rango esperado (±5%): ${official.expectedMin ?? "N/D"} - ${official.expectedMax ?? "N/D"}</p>
              <p style="margin:0 0 4px 0;">Participación: ${official.participacion !== null && official.participacion !== undefined ? `${official.participacion}%` : "N/D"}</p>
              <p style="margin:0;">Alertas: ${!official.hasOfficialData
                ? (official.officialNotice ?? "Sin información oficial histórica para el puesto y mesa reportados.")
                : official.overVoting && official.increaseAlert
                  ? "Sobrevotación e incremento fuera de rango"
                  : official.overVoting && official.decreaseAlert
                    ? "Sobrevotación y disminución fuera de rango"
                    : official.increaseAlert
                      ? "Incremento de votación fuera de rango"
                      : official.decreaseAlert
                        ? "Disminución de votación fuera de rango"
                        : official.mismatch
                          ? "Descuadre dentro de tolerancia"
                          : "Sin alertas"}</p>
            </div>
          `;

        return `
          <section style="margin-bottom:20px;padding:12px;border:1px solid #ddd;border-radius:8px;">
            <h3 style="margin:0 0 8px 0;">${escapeHtml(report.pollingStation ?? "Mesa")} · ${escapeHtml(report.municipality ?? "Sin municipio")}</h3>
            <p style="margin:0 0 6px 0;">Delegado: ${escapeHtml(report.delegateName ?? "Sin delegado")}${report.tableNumber !== null && report.tableNumber !== undefined ? ` · Mesa ${report.tableNumber}` : ""}</p>
            <p style="margin:0 0 8px 0;">Total: ${report.totalVotes} votos${report.reportedAt ? ` · ${escapeHtml(formatReportDate(report.reportedAt))}` : ""}</p>
            ${officialBlock}
            ${details}
          </section>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
          <h1 style="margin-top:0;">${escapeHtml(title)}</h1>
          ${body}
        </body>
      </html>
    `;

    const printFromIframe = () => {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const iframeDocument = iframeWindow?.document;
      if (!iframeWindow || !iframeDocument) {
        iframe.remove();
        toast({ title: "Imprimir", description: "No se pudo abrir la vista de impresión" });
        return;
      }

      iframeDocument.open();
      iframeDocument.write(html);
      iframeDocument.close();

      window.setTimeout(() => {
        iframeWindow.focus();
        iframeWindow.print();
        window.setTimeout(() => iframe.remove(), 1_000);
      }, 300);
    };

    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) {
      printFromIframe();
      return;
    }

    let printed = false;
    const runPrint = () => {
      if (printed) return;
      printed = true;
      popup.focus();
      popup.print();
    };

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.onload = () => window.setTimeout(runPrint, 150);
    window.setTimeout(runPrint, 800);
  };

  const handlePrint = () => {
    if (!canExportData) return;
    printReports(voteReports, "Reporte Electoral - General");
  };

  const handlePrintReport = (reportId: string) => {
    if (!canExportData) return;
    const report = voteReports.find((item) => item.id === reportId);
    if (!report) return;
    printReports([report], `Reporte Electoral - ${report.pollingStation ?? "Mesa"}`);
  };

  const handleExportAll = () => {
    if (!canExportData) return;
    exportReports(voteReports, "reporte-electoral", "Exportar Todo");
  };

  const handleExportReport = (reportId: string) => {
    if (!canExportData) return;
    const report = voteReports.find((item) => item.id === reportId);
    if (!report) return;
    const safeId = report.id.replace(/[^a-zA-Z0-9_-]/g, "-");
    exportReports([report], `reporte-electoral-${safeId}`, "Exportar Reporte");
  };

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="font-semibold text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Votos por mesa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 min-w-0">
          {loadingVotes && <p className="text-sm text-muted-foreground">Cargando votos...</p>}
          {!loadingVotes && votesError && <p className="text-sm text-destructive">{votesError}</p>}
          {!loadingVotes && !votesError && voteReports.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay reportes de votos.</p>
          )}

          {!loadingVotes && !votesError && voteReports.map((report) => (
            <div id={`reporte-${report.id}`} key={report.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 min-w-0 overflow-hidden">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground break-words">
                    {report.pollingStation ?? "Mesa"} · {report.municipality ?? "Sin municipio"}
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    Delegado: {report.delegateName ?? "Sin delegado"}
                    {report.tableNumber !== null && report.tableNumber !== undefined ? ` · Mesa ${report.tableNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    Total: {report.totalVotes} votos
                    {report.reportedAt
                      ? ` · ${new Date(report.reportedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`
                      : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-zinc-800/60 border-zinc-700 max-w-full"
                  onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                >
                  {expandedId === report.id ? "Ocultar detalle" : "Ver detalle"}
                </Button>
                {canExportData && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-zinc-700 max-w-full"
                      onClick={() => handlePrintReport(report.id)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white max-w-full"
                      onClick={() => handleExportReport(report.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                )}
              </div>

              {expandedId === report.id && (
                <div className="mt-3 grid gap-2 min-w-0">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 min-w-0 overflow-hidden">
                    <p className="text-sm font-semibold text-foreground">Datos oficiales mesa</p>
                    {!report.officialComparison?.hasOfficialData ? (
                      <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                        Sin información oficial histórica para el puesto y mesa reportados.
                      </div>
                    ) : !report.officialComparison?.outOfExpectedRange ? (
                      <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                        Consistencia validada: total reportado dentro del rango esperado (±5%).
                      </div>
                    ) : null}
                    <div className="mt-2 grid gap-1 text-xs text-muted-foreground min-w-0">
                      <p className="break-words">Total oficial: {report.officialComparison?.totalOficial ?? "N/D"}</p>
                      <p className="break-words">Total reportado: {report.officialComparison?.totalReported ?? report.totalVotes}</p>
                      <p className="break-words">Diferencia: {report.officialComparison?.diferencia ?? "N/D"}</p>
                      <p className="break-words">
                        Rango esperado (±5%): {report.officialComparison?.expectedMin ?? "N/D"}
                        {" - "}
                        {report.officialComparison?.expectedMax ?? "N/D"}
                      </p>
                      <p className="break-words">
                        Participación: {report.officialComparison?.participacion !== null && report.officialComparison?.participacion !== undefined
                          ? `${report.officialComparison.participacion}%`
                          : "N/D"}
                      </p>
                      <p className="break-words">
                        Alertas: {
                          !report.officialComparison?.hasOfficialData
                            ? (report.officialComparison?.officialNotice ?? "Sin información oficial histórica para el puesto y mesa reportados.")
                            : report.officialComparison.overVoting && report.officialComparison.increaseAlert
                              ? "Sobrevotación e incremento fuera de rango"
                              : report.officialComparison.overVoting && report.officialComparison.decreaseAlert
                                ? "Sobrevotación y disminución fuera de rango"
                                : report.officialComparison.increaseAlert
                                  ? "Incremento de votación fuera de rango"
                                  : report.officialComparison.decreaseAlert
                                    ? "Disminución de votación fuera de rango"
                                    : report.officialComparison.mismatch
                                      ? "Descuadre dentro de tolerancia"
                                      : "Sin alertas"
                        }
                      </p>
                    </div>
                  </div>

                  {report.details.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin detalle por candidato.</p>
                  )}
                  {report.details.map((detail) => (
                    <div
                      key={`${report.id}-${detail.candidateId}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground break-words">{detail.fullName ?? "Candidato"}</p>
                        <p className="text-[11px] text-muted-foreground break-words">
                          {detail.position ? detail.position : ""}
                          {detail.party ? ` · ${detail.party}` : ""}
                          {detail.ballotNumber ? ` · Tarjetón ${detail.ballotNumber}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">{detail.votes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canExportData && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 min-w-0">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground mb-1">Exportar Datos Completos</h3>
                <p className="text-sm text-muted-foreground break-words">
                  Descarga todos los datos de la jornada electoral en diferentes formatos
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="bg-transparent border-zinc-700 max-w-full"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700 text-white max-w-full"
                  onClick={handleExportAll}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
