"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, AlertCircle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useWarRoomData } from "./warroom-data-provider"

const severityStyles = {
  critical: {
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
  warning: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/30",
    icon: "text-neon-orange",
    badge: "bg-neon-orange text-background",
  },
  info: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: "text-primary",
    badge: "bg-primary text-primary-foreground",
  },
}

export function AlertsPanel() {
  const { data, loading, error } = useWarRoomData()
  const [handled, setHandled] = useState<string[]>([])
  const alerts = useMemo(() => (data?.alerts ?? []).filter((a) => !handled.includes(a.id)), [data?.alerts, handled])

  const handleAlert = (id: string, title: string) => {
    setHandled((prev) => (prev.includes(id) ? prev : [...prev, id]))
    toast({ title: "Alerta atendida", description: title })
  }

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-orange" />
            <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
              {loading ? "--" : `${alerts.filter(a => a.severity === "critical").length} crítica`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange text-xs font-medium">
              {loading ? "--" : `${alerts.filter(a => a.severity === "warning").length} avisos`}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {error && <p className="text-xs text-destructive px-2">{error}</p>}
          {loading && <div className="h-16 rounded-lg bg-secondary/50 animate-pulse" />}
          {!loading && alerts.map((alert, index) => {
            const styles = severityStyles[alert.severity as keyof typeof severityStyles]
            const Icon = alert.severity === "critical" ? XCircle : alert.severity === "warning" ? AlertTriangle : AlertCircle
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {alert.time ? new Date(alert.time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => handleAlert(alert.id, alert.title)}
                      >
                        Atender
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border/50">
        <Button variant="secondary" size="sm" className="w-full text-xs">
          Ver todas las alertas
        </Button>
      </div>
    </div>
  )
}
