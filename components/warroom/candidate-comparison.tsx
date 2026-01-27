"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useMemo } from "react"
import { useWarRoomData } from "./warroom-data-provider"

export function CandidateComparison() {
  const { data, loading, error } = useWarRoomData()
  const candidates = data?.candidates ?? []
  const totalVotes = useMemo(() => candidates.reduce((acc, c) => acc + c.votes, 0), [candidates])

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Comparativo de Candidatos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "Cargando..." : `${totalVotes.toLocaleString()} votos contabilizados`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Reportes verificados</p>
            <p className="text-lg font-bold text-foreground">{loading ? "--" : data?.stats.reports ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Progress Bars Visualization */}
      <div className="p-4 border-b border-border/50">
        <div className="h-8 rounded-lg overflow-hidden flex">
          {loading && <div className="w-full bg-secondary animate-pulse" />}
          {!loading && candidates.length === 0 && (
            <div className="w-full bg-secondary/40 text-center text-xs text-muted-foreground flex items-center justify-center">
              Sin datos de votos
            </div>
          )}
          {!loading && candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ width: 0 }}
              animate={{ width: `${candidate.percentage}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className={`${candidate.color ?? "bg-primary"} ${index === 0 ? "rounded-l-lg" : ""} ${index === candidates.length - 1 ? "rounded-r-lg" : ""}`}
              style={{ minWidth: candidate.percentage > 5 ? "auto" : "2%" }}
            />
          ))}
        </div>
      </div>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {loading && <div className="h-24 rounded-lg bg-secondary/50 animate-pulse" />}
          {!loading && candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg transition-colors ${
                index === 0 ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${candidate.color ?? "bg-primary"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-medium">
                          NUESTRO
                        </span>
                      )}
                    </div>
                    {candidate.party && <p className="text-xs text-muted-foreground">{candidate.party}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-foreground">{candidate.percentage}%</p>
                    <div className={`flex items-center gap-0.5 text-xs ${index === 0 ? "text-neon-green" : "text-destructive"}`}>
                      {index === 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {index === 0 ? "+" : "-"}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{candidate.votes.toLocaleString()} votos</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${candidate.percentage}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  className={`h-full rounded-full ${candidate.color ?? "bg-primary"}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-secondary/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Última actualización: {data?.stats.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleTimeString("es-CO") : "--"}
        </p>
      </div>
    </div>
  )
}
