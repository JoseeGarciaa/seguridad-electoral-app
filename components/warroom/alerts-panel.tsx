"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, AlertCircle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWarRoomData, type WarRoomAlert } from "./warroom-data-provider"

type ApiAlertStatus = "abierta" | "atendida" | "resuelta"

type PanelAlert = WarRoomAlert & {
  reportUrl?: string | null
}

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
    bg: "bg-emerald-600/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-400",
    badge: "bg-emerald-500 text-emerald-950",
  },
}

const noticeStyles = {
  bg: "bg-emerald-600/10",
  border: "border-emerald-500/30",
  icon: "text-emerald-400",
  badge: "bg-emerald-500 text-emerald-950",
}

export function AlertsPanel() {
  const router = useRouter()
  const { data, error: warroomError, loading } = useWarRoomData()

  const normalizeStatus = (value?: string | null): ApiAlertStatus => {
    const normalized = value?.toLowerCase()
    if (normalized === "resuelta" || normalized === "resolved" || normalized === "verified") return "resuelta"
    if (normalized === "atendida" || normalized === "in_progress" || normalized === "inprogress") return "atendida"
    return "abierta"
  }

  const filterOpenAlerts = (items: (WarRoomAlert & { status?: ApiAlertStatus | string | null })[]) =>
    items.filter((item) => normalizeStatus(item.status) === "abierta")

  const resolveAlertId = (value?: string | null) => {
    const normalized = value?.trim()
    return normalized && normalized.length > 0 ? normalized : null
  }

  const alerts = useMemo<PanelAlert[]>(() => {
    const items = (data?.alerts ?? []) as PanelAlert[]
    return filterOpenAlerts(items.map((item) => ({ ...item, status: item.status ?? "abierta" })))
  }, [data?.alerts])

  const handleAlert = (id?: string, reportUrl?: string | null) => {
    const target = reportUrl || (id ? `/dashboard/alertas#${id}` : "/dashboard/alertas")
    router.push(target)
  }

  const formatTime = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value || "--"
    return parsed.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  }

  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === "critical").length, [alerts])
  const warningCount = useMemo(() => alerts.filter((a) => a.severity === "warning").length, [alerts])

  const renderAlerts = useMemo(() => alerts, [alerts])

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-neon-orange" />
            <h3 className="text-base font-semibold text-foreground">Alertas</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
              {loading ? "--" : `${criticalCount} crítica`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange text-xs font-medium">
              {loading ? "--" : `${warningCount} avisos`}
            </span>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {warroomError && <p className="text-sm text-destructive px-2">{warroomError}</p>}
          {loading && <div className="h-16 rounded-lg bg-secondary/50 animate-pulse" />}
          {!loading && renderAlerts.map((alert, index) => {
            const keyId = resolveAlertId(alert.id)
            const alertKey = keyId ?? `alert-${alert.category ?? "generic"}-${alert.time ?? "no-time"}-${index}`
            const isNotice = (alert.category ?? "").toLowerCase() === "votos"
            const styles = isNotice ? noticeStyles : severityStyles[alert.severity as keyof typeof severityStyles]
            const Icon = isNotice
              ? CheckCircle
              : alert.severity === "critical"
                ? XCircle
                : alert.severity === "warning"
                  ? AlertTriangle
                  : AlertCircle
            return (
              <motion.div
                key={alertKey}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`min-h-[132px] p-2.5 rounded-lg ${styles.bg} border ${styles.border} flex`}
              >
                <div className="flex items-start gap-2 w-full">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                  <div className="flex-1 min-w-0 flex flex-col h-full">
                    <p className="text-sm font-medium text-foreground leading-tight">{alert.title}</p>
                    <p
                      className="text-xs text-muted-foreground mt-0.5 leading-snug break-words"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {alert.message}
                    </p>
                    <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {alert.time ? formatTime(alert.time) : "--"}
                      </span>
                      {isNotice && !alert.reportUrl ? (
                        <span className="text-[11px] text-muted-foreground">Aviso</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-7 text-xs px-2"
                          onClick={() =>
                            alert.severity === "critical"
                              ? handleAlert(alert.id, null)
                              : handleAlert(alert.id, alert.reportUrl)
                          }
                        >
                          {alert.severity === "critical" ? "Atender" : alert.reportUrl ? "Ver" : "Atender"}
                        </Button>
                      )}
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
        <Button variant="secondary" size="sm" className="w-full text-sm" onClick={() => handleAlert()}>
          Ver todas las alertas
        </Button>
      </div>
    </div>
  )
}
