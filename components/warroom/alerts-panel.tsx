"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, AlertCircle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const alerts = [
  {
    id: 1,
    severity: "critical",
    title: "Sin cobertura",
    message: "Puesto 2345 en Medellín sin testigo asignado",
    time: "Hace 5 min",
    icon: XCircle,
  },
  {
    id: 2,
    severity: "warning",
    title: "Anomalía detectada",
    message: "Diferencia de votos > 10% en Mesa 5, Puesto 892",
    time: "Hace 12 min",
    icon: AlertTriangle,
  },
  {
    id: 3,
    severity: "warning",
    title: "Evidencia pendiente",
    message: "3 actas sin verificar en Puesto 456",
    time: "Hace 18 min",
    icon: AlertCircle,
  },
  {
    id: 4,
    severity: "info",
    title: "Cobertura recuperada",
    message: "Puesto 1234 ahora tiene testigo activo",
    time: "Hace 25 min",
    icon: CheckCircle,
  },
]

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
              1 crítica
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange text-xs font-medium">
              2 avisos
            </span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {alerts.map((alert, index) => {
            const styles = severityStyles[alert.severity as keyof typeof severityStyles]
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}
              >
                <div className="flex items-start gap-2">
                  <alert.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
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
