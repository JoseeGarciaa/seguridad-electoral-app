"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, AlertCircle, XCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useWarRoomData, type WarRoomAlert } from "./warroom-data-provider"

type ApiAlertStatus = "abierta" | "atendida" | "resuelta"

type ApiAlertItem = {
  id: string
  title?: string
  level?: "crítica" | "alta" | "media"
  category?: string
  municipality?: string
  time?: string | null
  detail?: string | null
  status?: ApiAlertStatus | string | null
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
  const { data, error: warroomError } = useWarRoomData()
  const [alerts, setAlerts] = useState<WarRoomAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [alertsError, setAlertsError] = useState<string | null>(null)

  const normalizeStatus = (value?: string | null): ApiAlertStatus => {
    const normalized = value?.toLowerCase()
    if (normalized === "resuelta" || normalized === "resolved" || normalized === "verified") return "resuelta"
    if (normalized === "atendida" || normalized === "in_progress" || normalized === "inprogress") return "atendida"
    return "abierta"
  }

  const filterOpenAlerts = (items: (WarRoomAlert & { status?: ApiAlertStatus | string | null })[]) =>
    items.filter((item) => normalizeStatus(item.status) === "abierta")

  useEffect(() => {
    let cancelled = false

    const severityMap: Record<string, keyof typeof severityStyles> = {
      "crítica": "critical",
      "alta": "warning",
      "media": "info",
    }

    const mapApiAlert = (item: ApiAlertItem, idx: number) => {
      const isVoteNotice = (item.category ?? "").toLowerCase() === "votos"
      const severity = isVoteNotice ? "warning" : severityMap[item.level ?? ""] ?? "info"
      const municipality = item.municipality?.trim() || "Sin municipio"
      const detail = item.detail?.trim()
      const message = detail ? `${municipality} - ${detail}` : municipality
      const time = item.time ?? new Date().toISOString()
      const status = normalizeStatus(item.status)
      return {
        id: item.id || `alert-${idx}`,
        severity,
        title: item.title || "Alerta",
        message,
        time,
        status,
        category: item.category,
      }
    }

    const loadAlerts = async () => {
      setLoading(true)
      setAlertsError(null)
      try {
        const res = await fetch("/api/alerts?limit=20", { cache: "no-store" })
        if (!res.ok) throw new Error("No se pudo cargar las alertas reales")
        const json = await res.json()
        if (cancelled) return
        const items: ApiAlertItem[] = Array.isArray(json?.items) ? json.items : []
        const mapped = filterOpenAlerts(items.map(mapApiAlert))
        const fallback = filterOpenAlerts((data?.alerts ?? []).map((a) => ({ ...a, status: a.status ?? "abierta" })))
        setAlerts(mapped.length > 0 ? mapped : fallback)
      } catch (err: any) {
        if (cancelled) return
        const fallback = data?.alerts ?? []
        setAlerts(filterOpenAlerts(fallback))
        const message = err?.message ?? "No se pudo cargar las alertas"
        setAlertsError(message)
        toast({ title: "Alertas", description: message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAlerts()
    return () => {
      cancelled = true
    }
  }, [data?.alerts])

  const handleAlert = (id?: string) => {
    const target = id ? `/dashboard/alertas#${id}` : "/dashboard/alertas"
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
            <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
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
          {(alertsError || warroomError) && <p className="text-xs text-destructive px-2">{alertsError || warroomError}</p>}
          {loading && <div className="h-16 rounded-lg bg-secondary/50 animate-pulse" />}
          {!loading && renderAlerts.map((alert, index) => {
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
                        {alert.time ? formatTime(alert.time) : "--"}
                      </span>
                      {isNotice ? (
                        <span className="text-[10px] text-muted-foreground">Aviso</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => handleAlert(alert.id)}
                        >
                          Atender
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
        <Button variant="secondary" size="sm" className="w-full text-xs" onClick={() => handleAlert()}>
          Ver todas las alertas
        </Button>
      </div>
    </div>
  )
}
