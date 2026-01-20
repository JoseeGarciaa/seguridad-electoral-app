"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Camera, CheckCircle, AlertTriangle, MapPin, User } from "lucide-react"

const feedItems = [
  {
    id: 1,
    type: "evidence",
    user: "María González",
    action: "Acta subida",
    location: "Puesto 1247, Mesa 3",
    time: "Hace 30s",
    icon: Camera,
    color: "text-primary",
  },
  {
    id: 2,
    type: "verification",
    user: "Sistema",
    action: "Acta verificada",
    location: "Puesto 892, Mesa 1",
    time: "Hace 1m",
    icon: CheckCircle,
    color: "text-neon-green",
  },
  {
    id: 3,
    type: "alert",
    user: "Carlos Ruiz",
    action: "Reportó anomalía",
    location: "Puesto 456, Mesa 2",
    time: "Hace 2m",
    icon: AlertTriangle,
    color: "text-neon-orange",
  },
  {
    id: 4,
    type: "checkin",
    user: "Ana Martínez",
    action: "Check-in confirmado",
    location: "Puesto 2134",
    time: "Hace 3m",
    icon: MapPin,
    color: "text-neon-cyan",
  },
  {
    id: 5,
    type: "assignment",
    user: "Pedro López",
    action: "Testigo asignado",
    location: "Puesto 789",
    time: "Hace 5m",
    icon: User,
    color: "text-accent",
  },
  {
    id: 6,
    type: "evidence",
    user: "Laura García",
    action: "Acta subida",
    location: "Puesto 345, Mesa 5",
    time: "Hace 6m",
    icon: Camera,
    color: "text-primary",
  },
  {
    id: 7,
    type: "verification",
    user: "Sistema",
    action: "Acta verificada",
    location: "Puesto 567, Mesa 2",
    time: "Hace 8m",
    icon: CheckCircle,
    color: "text-neon-green",
  },
]

export function LiveFeed() {
  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <h3 className="text-sm font-semibold text-foreground">Feed en Vivo</h3>
        </div>
        <span className="text-xs text-muted-foreground">{feedItems.length} eventos</span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <AnimatePresence>
          {feedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-md bg-secondary flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-medium">{item.user}</span>
                    {" • "}{item.action}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{item.location}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
              </div>
            </motion.div>
          ))}
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
