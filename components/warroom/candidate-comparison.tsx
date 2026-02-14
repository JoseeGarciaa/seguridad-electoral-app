"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWarRoomData } from "./warroom-data-provider"

export function CandidateComparison() {
  const { data, loading, error } = useWarRoomData()
  const candidates = data?.candidates ?? []
  const parties = data?.parties ?? []
  const totalCandidateVotes = useMemo(() => candidates.reduce((acc, c) => acc + c.votes, 0), [candidates])
  const totalPartyVotes = useMemo(() => parties.reduce((acc, party) => acc + party.totalVotes, 0), [parties])

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Comparativo de Candidatos</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Cargando..." : `${totalPartyVotes.toLocaleString()} votos contabilizados`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Reportes verificados</p>
            <p className="text-xl font-bold text-foreground">{loading ? "--" : data?.stats.reports ?? 0}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="candidates" className="flex-1 min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="candidates">Por Candidato</TabsTrigger>
            <TabsTrigger value="parties">Por Partido</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="candidates" className="flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="h-8 rounded-lg overflow-hidden flex">
              {loading && <div className="w-full bg-secondary animate-pulse" />}
              {!loading && candidates.length === 0 && (
                <div className="w-full bg-secondary/40 text-center text-sm text-muted-foreground flex items-center justify-center">
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

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
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
                          <p className="text-base font-medium text-foreground">{candidate.name}</p>
                          {index === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary font-medium">
                              NUESTRO
                            </span>
                          )}
                        </div>
                        {candidate.party && <p className="text-sm text-muted-foreground">{candidate.party}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-foreground">{candidate.percentage}%</p>
                        <div className={`flex items-center gap-0.5 text-sm ${index === 0 ? "text-neon-green" : "text-destructive"}`}>
                          {index === 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {index === 0 ? "+" : "-"}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{candidate.votes.toLocaleString()} votos</p>
                    </div>
                  </div>

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

          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">Total por candidatos visibles: {totalCandidateVotes.toLocaleString()} votos</p>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              {loading && <div className="h-24 rounded-lg bg-secondary/50 animate-pulse" />}
              {!loading && parties.length === 0 && (
                <div className="p-4 rounded-lg bg-secondary/40 text-sm text-muted-foreground">Sin datos de partidos</div>
              )}
              {!loading && parties.map((party, index) => (
                <motion.div
                  key={party.party}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className={`p-3 rounded-lg transition-colors ${index === 0 ? "bg-primary/10 border border-primary/20" : "bg-secondary/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{party.party}</p>
                      <p className="text-xs text-muted-foreground">{party.candidateCount} candidatos con votos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{party.totalVotes.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{party.percentage}% del total</p>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
                      <span className="text-muted-foreground">Voto por candidato</span>
                      <p className="font-semibold text-foreground">{party.candidateVotes.toLocaleString()}</p>
                    </div>
                    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
                      <span className="text-muted-foreground">Voto por lista</span>
                      <p className="font-semibold text-foreground">{party.listVotes.toLocaleString()}</p>
                    </div>
                  </div>

                  {party.topCandidates.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {party.topCandidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate pr-2">{candidate.name}</span>
                          <span className="text-foreground font-medium">{candidate.votes.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">Total partidos (candidato + lista): {totalPartyVotes.toLocaleString()} votos</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-secondary/20">
        <p className="text-xs text-muted-foreground text-center">
          Última actualización: {data?.stats.lastUpdated ? new Date(data.stats.lastUpdated).toLocaleTimeString("es-CO") : "--"}
        </p>
      </div>
    </div>
  )
}
