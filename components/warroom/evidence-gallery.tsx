"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, AlertTriangle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMemo } from "react"
import { useWarRoomData } from "./warroom-data-provider"

const statusConfig = {
  verified: {
    icon: CheckCircle,
    label: "Verificada",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  pending: {
    icon: Clock,
    label: "Pendiente",
    color: "text-neon-orange",
    bg: "bg-neon-orange/10",
  },
  issue: {
    icon: AlertTriangle,
    label: "Revisar",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
}

export function EvidenceGallery() {
  const { data, loading, error } = useWarRoomData()
  const evidences = useMemo(() => data?.evidences ?? [], [data])

  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Evidencias Recientes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Actas y fotos de mesas</p>
        </div>
        <Button variant="secondary" size="sm" className="text-xs">
          Ver todas
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {error && <p className="text-xs text-destructive col-span-3">{error}</p>}
        {loading && <div className="col-span-3 h-24 rounded-lg bg-secondary/50 animate-pulse" />}
        {!loading && evidences.map((evidence, index) => {
          const status = statusConfig[evidence.status as keyof typeof statusConfig]
          return (
            <motion.div
              key={evidence.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-square rounded-lg bg-secondary/50 border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                {evidence.photoUrl ? (
                  <img src={evidence.photoUrl} alt={evidence.puesto} className="object-cover w-full h-full" />
                ) : (
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                      <Eye className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Acta</p>
                  </div>
                )}
              </div>

              <div className={`absolute top-1 right-1 p-1 rounded ${status.bg}`}>
                <status.icon className={`w-3 h-3 ${status.color}`} />
              </div>

              <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                <p className="text-xs font-medium text-foreground truncate">{evidence.puesto}</p>
                <p className="text-[10px] text-muted-foreground">{evidence.mesa}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{evidence.user}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{loading ? "--" : `${evidences.filter(e => e.status === "verified").length} verificadas`}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{loading ? "--" : `${evidences.filter(e => e.status === "pending").length} pendientes`}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">{loading ? "--" : `${evidences.filter(e => e.status === "issue").length} por revisar`}</span>
          </div>
        </div>
        <span className="text-muted-foreground">Total: {loading ? "--" : evidences.length}</span>
      </div>
    </div>
  )
}
