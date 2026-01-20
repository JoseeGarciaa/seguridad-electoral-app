"use client"

import { motion } from "framer-motion"
import { Camera, UserPlus, CheckCircle, MapPin } from "lucide-react"

const activities = [
  {
    id: "1",
    type: "evidence",
    user: "María González",
    action: "subió evidencia",
    target: "Puesto 1247 - Mesa 3",
    time: "Hace 2 min",
    icon: Camera,
  },
  {
    id: "2",
    type: "assignment",
    user: "Carlos Rodríguez",
    action: "asignó testigo",
    target: "Puesto 892 - Medellín",
    time: "Hace 5 min",
    icon: UserPlus,
  },
  {
    id: "3",
    type: "verification",
    user: "Sistema",
    action: "verificó acta",
    target: "Puesto 456 - Cali",
    time: "Hace 8 min",
    icon: CheckCircle,
  },
  {
    id: "4",
    type: "location",
    user: "Ana Martínez",
    action: "confirmó ubicación",
    target: "Puesto 2134 - Barranquilla",
    time: "Hace 12 min",
    icon: MapPin,
  },
]

export function ActivityFeed() {
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
                <activity.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{activity.user}</span>
                  {" "}{activity.action}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.target}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
