"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle, MapPin, UserPlus } from "lucide-react"
import type { ActivityItem } from "@/lib/dashboard-data"

const icons = {
  alert: AlertTriangle,
  assignment: UserPlus,
  vote: CheckCircle,
  default: MapPin,
}

export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="glass rounded-xl border border-border/50 p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Actividad Reciente</h2>
        <span className="text-xs text-muted-foreground">Últimos 15 minutos</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-64 p-3 rounded-lg bg-secondary/50 border border-border/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {(() => {
                  const Icon = icons[activity.type as keyof typeof icons] || icons.default
                  return <Icon className="w-4 h-4 text-primary" />
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.detail}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
