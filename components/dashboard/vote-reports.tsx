import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { VoteReportSummary } from "@/lib/dashboard-data"

const numberFormatter = new Intl.NumberFormat("es-CO")

export function VoteReportsCard({ reports }: { reports: VoteReportSummary[] }) {
  return (
    <div className="glass rounded-xl border border-border/50 p-4 lg:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Votos recientes</h2>
        <Link href="/dashboard/reportes">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todos
          </Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay reportes de votos registrados.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const topDetails = report.details.slice(0, 3)
            const reportedAt = report.reportedAt
              ? new Date(report.reportedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
              : ""

            return (
              <div key={report.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {report.pollingStation ?? "Mesa"} · {report.municipality ?? "Sin municipio"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.department ?? ""}
                      {report.department && reportedAt ? " · " : ""}
                      {reportedAt}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-600/30">
                    {numberFormatter.format(report.totalVotes)} votos
                  </Badge>
                </div>

                {topDetails.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topDetails.map((detail) => (
                      <div
                        key={`${report.id}-${detail.candidateId}`}
                        className="rounded-full border border-zinc-700/60 bg-zinc-900/60 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {detail.fullName ?? "Candidato"}: {numberFormatter.format(detail.votes)}
                      </div>
                    ))}
                    {report.details.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{report.details.length - 3} más</span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Sin detalle por candidato.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
