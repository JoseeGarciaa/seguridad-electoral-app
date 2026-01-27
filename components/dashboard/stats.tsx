"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, Building2, CheckCircle, Users } from "lucide-react"
import type { DashboardStat } from "@/lib/dashboard-data"

type DashboardStatItem = DashboardStat & { icon?: LucideIcon }

const fallbackIcons = [Building2, Users, CheckCircle, AlertTriangle]

export function DashboardStats({ stats }: { stats: DashboardStatItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="glass rounded-xl border border-border/50 p-4 lg:p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              {(() => {
                const Icon = stat.icon || fallbackIcons[index % fallbackIcons.length]
                return <Icon className="w-5 h-5 text-primary" />
              })()}
            </div>
            {stat.change ? (
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.changeType === "negative"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-neon-green/10 text-neon-green"
                }`}
              >
                {stat.change}
              </span>
            ) : null}
          </div>
          <div className="mt-4">
            <p className="text-2xl lg:text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {stat.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stat.description}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
