"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AlertItem } from "@/lib/dashboard-data"

const alertStyles = {
  critical: {
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: "text-destructive",
  },
  high: {
    bg: "bg-neon-orange/10",
    border: "border-neon-orange/20",
    icon: "text-neon-orange",
  },
  medium: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
  },
  low: {
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: "text-primary",
  },
}

const iconForSeverity = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
}

export function RecentAlerts({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="glass rounded-xl border border-border/50 p-4 lg:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Alertas Recientes</h2>
        <Link href="/dashboard/alertas">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todas
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const styles = alertStyles[alert.severity as keyof typeof alertStyles] || alertStyles.medium
          const Icon = iconForSeverity[alert.severity as keyof typeof iconForSeverity] || Info
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg ${styles.bg} border ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 mt-0.5 ${styles.icon}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
