"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"

const candidates = [
  {
    id: 1,
    name: "Candidato A",
    party: "Partido Verde",
    votes: 45230,
    percentage: 42.5,
    color: "bg-neon-green",
    trend: "up",
    change: "+2.3%",
    isOwn: true,
  },
  {
    id: 2,
    name: "Candidato B",
    party: "Partido Azul",
    votes: 38450,
    percentage: 36.1,
    color: "bg-neon-cyan",
    trend: "down",
    change: "-1.2%",
    isOwn: false,
  },
  {
    id: 3,
    name: "Candidato C",
    party: "Partido Naranja",
    votes: 15320,
    percentage: 14.4,
    color: "bg-neon-orange",
    trend: "up",
    change: "+0.5%",
    isOwn: false,
  },
  {
    id: 4,
    name: "Otros",
    party: "Varios",
    votes: 7450,
    percentage: 7.0,
    color: "bg-muted",
    trend: "down",
    change: "-0.8%",
    isOwn: false,
  },
]

export function CandidateComparison() {
  const totalVotes = candidates.reduce((acc, c) => acc + c.votes, 0)

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Comparativo de Candidatos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalVotes.toLocaleString()} votos contabilizados
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Reportes verificados</p>
            <p className="text-lg font-bold text-foreground">1,247</p>
          </div>
        </div>
      </div>

      {/* Progress Bars Visualization */}
      <div className="p-4 border-b border-border/50">
        <div className="h-8 rounded-lg overflow-hidden flex">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ width: 0 }}
              animate={{ width: `${candidate.percentage}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className={`${candidate.color} ${index === 0 ? "rounded-l-lg" : ""} ${index === candidates.length - 1 ? "rounded-r-lg" : ""}`}
              style={{ minWidth: candidate.percentage > 5 ? "auto" : "2%" }}
            />
          ))}
        </div>
      </div>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {candidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg transition-colors ${
                candidate.isOwn 
                  ? "bg-primary/10 border border-primary/20" 
                  : "bg-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${candidate.color}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{candidate.name}</p>
                      {candidate.isOwn && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary font-medium">
                          NUESTRO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{candidate.party}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-foreground">{candidate.percentage}%</p>
                    <div className={`flex items-center gap-0.5 text-xs ${
                      candidate.trend === "up" ? "text-neon-green" : "text-destructive"
                    }`}>
                      {candidate.trend === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {candidate.change}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {candidate.votes.toLocaleString()} votos
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${candidate.percentage}%` }}
                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                  className={`h-full rounded-full ${candidate.color}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-secondary/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Última actualización: hace 30 segundos
        </p>
      </div>
    </div>
  )
}
