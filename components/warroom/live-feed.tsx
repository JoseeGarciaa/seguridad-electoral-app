"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Camera, CheckCircle, AlertTriangle, MapPin, User } from "lucide-react"
import { useMemo, type ComponentType } from "react"
import { useWarRoomData } from "./warroom-data-provider"

const typeIcon: Record<string, { icon: ComponentType<{ className?: string }>; color: string }> = {
  evidence: { icon: Camera, color: "text-primary" },
  verification: { icon: CheckCircle, color: "text-neon-green" },
  alert: { icon: AlertTriangle, color: "text-neon-orange" },
  checkin: { icon: MapPin, color: "text-neon-cyan" },
  assignment: { icon: User, color: "text-accent" },
}

export function LiveFeed() {
  const { data, loading, error } = useWarRoomData()
  const feedItems = useMemo(() => data?.feed ?? [], [data])
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota" }),
    [],
  )
  return (
    <div className="glass rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <h3 className="text-base font-semibold text-foreground">Feed en Vivo</h3>
        </div>
        <span className="text-sm text-muted-foreground">{loading ? "--" : `${feedItems.length} eventos`}</span>
      </div>

      {/* Feed */}
      <div className="p-2 space-y-2">
        <AnimatePresence>
          {error && feedItems.length === 0 && <p className="text-sm text-destructive px-2">{error}</p>}
          {loading && <div className="rounded-lg bg-secondary/50 animate-pulse py-6" />}
          {!loading && !error && feedItems.length === 0 && (
            <div className="rounded-lg border border-border/50 bg-secondary/20 flex items-center justify-center px-3 py-6">
              <p className="text-sm text-muted-foreground text-center">Sin actividad reciente</p>
            </div>
          )}
          {!loading && feedItems.map((item, index) => {
            const meta = typeIcon[item.type] ?? typeIcon.evidence
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <meta.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.user}</span>
                      {" • "}{item.action}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.location}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {item.reportedAt ? timeFormatter.format(new Date(item.reportedAt)) : "--"}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 bg-secondary/20">
        <p className="text-xs text-muted-foreground text-center">
          Actualizando automáticamente...
        </p>
      </div>
    </div>
  )
}
