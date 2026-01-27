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

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Feed en Vivo</h3>
        </div>
        <span className="text-xs text-muted-foreground">{loading ? "--" : `${feedItems.length} eventos`}</span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {error && <p className="text-xs text-destructive px-2">{error}</p>}
          {loading && <div className="h-24 rounded-lg bg-secondary/50 animate-pulse" />}
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
                  <div className={`w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    <meta.icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{item.user}</span>
                      {" • "}{item.action}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.location}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {item.reportedAt ? new Date(item.reportedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "--"}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 bg-secondary/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Actualizando automáticamente...
        </p>
      </div>
    </div>
  )
}
