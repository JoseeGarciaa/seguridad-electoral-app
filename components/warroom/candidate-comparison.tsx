"use client"

import { motion } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useWarRoomData } from "./warroom-data-provider"

export function CandidateComparison() {
  const { data, loading, error } = useWarRoomData()
  const [search, setSearch] = useState("")
  const [localCandidates, setLocalCandidates] = useState(data?.candidates ?? [])
  const [localParties, setLocalParties] = useState(data?.parties ?? [])
  const hasInitialComparisonData = (data?.candidates?.length ?? 0) > 0 || (data?.parties?.length ?? 0) > 0
  const [localLoading, setLocalLoading] = useState(!hasInitialComparisonData)
  const [localError, setLocalError] = useState<string | null>(null)
  const numberFormatter = useMemo(() => new Intl.NumberFormat("en-US"), [])
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "America/Bogota" }),
    [],
  )
  const formatNumber = (value: number) => numberFormatter.format(value).replace(/,/g, ".")

  useEffect(() => {
    let cancelled = false
    const hasSeedData = (data?.candidates?.length ?? 0) > 0 || (data?.parties?.length ?? 0) > 0
    if (hasSeedData) {
      setLocalLoading(false)
    }

    const load = async () => {
      setLocalError(null)
      try {
        const res = await fetch("/api/warroom/candidates", { cache: "no-store" })
        if (!res.ok) {
          throw new Error("No se pudo actualizar el comparativo")
        }
        const json = await res.json()
        if (cancelled) return
        setLocalCandidates(Array.isArray(json?.candidates) ? json.candidates : [])
        setLocalParties(Array.isArray(json?.parties) ? json.parties : [])
      } catch (err: any) {
        if (cancelled) return
        setLocalError(err?.message ?? "No se pudo cargar comparativo")
      } finally {
        if (!cancelled) {
          setLocalLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const candidates = localCandidates.length > 0 ? localCandidates : (data?.candidates ?? [])
  const parties = localParties.length > 0 ? localParties : (data?.parties ?? [])
  const comparisonLoading = loading || localLoading
  const comparisonError = localError || error
  const hasRenderableData = candidates.length > 0 || parties.length > 0
  const normalizedSearch = search.trim().toLowerCase()
  const filteredCandidates = useMemo(() => {
    if (!normalizedSearch) return candidates
    return candidates.filter((candidate) => {
      const byName = candidate.name.toLowerCase().includes(normalizedSearch)
      const byParty = (candidate.party ?? "").toLowerCase().includes(normalizedSearch)
      return byName || byParty
    })
  }, [candidates, normalizedSearch])
  const filteredParties = useMemo(() => {
    if (!normalizedSearch) return parties
    return parties.filter((party) => {
      const byParty = party.party.toLowerCase().includes(normalizedSearch)
      const byCandidate = party.topCandidates.some((candidate) => candidate.name.toLowerCase().includes(normalizedSearch))
      return byParty || byCandidate
    })
  }, [parties, normalizedSearch])
  const totalCandidateVotes = useMemo(() => candidates.reduce((acc, c) => acc + c.votes, 0), [candidates])
  const totalPartyVotes = useMemo(() => parties.reduce((acc, party) => acc + party.totalVotes, 0), [parties])
  const totalFilteredCandidateVotes = useMemo(
    () => filteredCandidates.reduce((acc, candidate) => acc + candidate.votes, 0),
    [filteredCandidates],
  )
  const totalFilteredPartyVotes = useMemo(
    () => filteredParties.reduce((acc, party) => acc + party.totalVotes, 0),
    [filteredParties],
  )

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Comparativo de Candidatos</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {comparisonLoading ? "Cargando..." : `${formatNumber(totalPartyVotes)} votos contabilizados`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Reportes verificados</p>
            <p className="text-xl font-bold text-foreground">{comparisonLoading ? "--" : data?.stats.reports ?? 0}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="candidates" className="flex-1 min-h-0">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="candidates">Por Candidato</TabsTrigger>
            <TabsTrigger value="parties">Por Partido</TabsTrigger>
          </TabsList>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar por candidato o partido"
            className="mt-3"
          />
        </div>

        <TabsContent value="candidates" className="flex-1 min-h-0 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="h-8 rounded-lg overflow-hidden flex">
              {comparisonLoading && <div className="w-full bg-secondary animate-pulse" />}
              {!comparisonLoading && filteredCandidates.length === 0 && (
                <div className="w-full bg-secondary/40 text-center text-sm text-muted-foreground flex items-center justify-center">
                  {normalizedSearch ? "Sin coincidencias" : "Sin datos de votos"}
                </div>
              )}
              {!comparisonLoading && filteredCandidates.map((candidate, index) => (
                <motion.div
                  key={candidate.id}
                  initial={{ width: 0 }}
                  animate={{ width: `${candidate.percentage}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className={`${candidate.color ?? "bg-primary"} ${index === 0 ? "rounded-l-lg" : ""} ${index === filteredCandidates.length - 1 ? "rounded-r-lg" : ""}`}
                  style={{ minWidth: candidate.percentage > 5 ? "auto" : "2%" }}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {comparisonError && !hasRenderableData && <p className="text-sm text-destructive">{comparisonError}</p>}
              {comparisonLoading && <div className="h-24 rounded-lg bg-secondary/50 animate-pulse" />}
              {!comparisonLoading && filteredCandidates.map((candidate, index) => (
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
                      <p className="text-sm text-muted-foreground">{formatNumber(candidate.votes)} votos</p>
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
            <p className="text-xs text-muted-foreground">Total por candidatos visibles: {formatNumber(totalFilteredCandidateVotes)} votos</p>
          </div>
        </TabsContent>

        <TabsContent value="parties" className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {comparisonError && !hasRenderableData && <p className="text-sm text-destructive">{comparisonError}</p>}
              {comparisonLoading && <div className="h-24 rounded-lg bg-secondary/50 animate-pulse" />}
              {!comparisonLoading && filteredParties.length === 0 && (
                <div className="p-4 rounded-lg bg-secondary/40 text-sm text-muted-foreground">
                  {normalizedSearch ? "Sin coincidencias" : "Sin datos de partidos"}
                </div>
              )}
              {!comparisonLoading && filteredParties.map((party, index) => (
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
                      <p className="text-lg font-bold text-foreground">{formatNumber(party.totalVotes)}</p>
                      <p className="text-xs text-muted-foreground">{party.percentage}% del total</p>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
                      <span className="text-muted-foreground">Voto por candidato</span>
                      <p className="font-semibold text-foreground">{formatNumber(party.candidateVotes)}</p>
                    </div>
                    <div className="rounded-md bg-secondary/60 px-2 py-1.5">
                      <span className="text-muted-foreground">Voto por lista</span>
                      <p className="font-semibold text-foreground">{formatNumber(party.listVotes)}</p>
                    </div>
                  </div>

                  {party.topCandidates.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {party.topCandidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate pr-2">{candidate.name}</span>
                          <span className="text-foreground font-medium">{formatNumber(candidate.votes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">Total partidos (candidato + lista): {formatNumber(totalFilteredPartyVotes)} votos</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 bg-secondary/20">
        <p className="text-xs text-muted-foreground text-center">
          Última actualización: {data?.stats.lastUpdated ? timeFormatter.format(new Date(data.stats.lastUpdated)) : "--"}
        </p>
      </div>
    </div>
  )
}
