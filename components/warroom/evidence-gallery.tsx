"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, AlertTriangle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

const evidences = [
  {
    id: 1,
    puesto: "Puesto 1247",
    mesa: "Mesa 3",
    user: "María González",
    time: "Hace 2 min",
    status: "verified",
    thumbnail: null,
  },
  {
    id: 2,
    puesto: "Puesto 892",
    mesa: "Mesa 1",
    user: "Carlos Ruiz",
    time: "Hace 5 min",
    status: "pending",
    thumbnail: null,
  },
  {
    id: 3,
    puesto: "Puesto 456",
    mesa: "Mesa 2",
    user: "Ana Martínez",
    time: "Hace 8 min",
    status: "verified",
    thumbnail: null,
  },
  {
    id: 4,
    puesto: "Puesto 2134",
    mesa: "Mesa 5",
    user: "Pedro López",
    time: "Hace 12 min",
    status: "issue",
    thumbnail: null,
  },
  {
    id: 5,
    puesto: "Puesto 789",
    mesa: "Mesa 4",
    user: "Laura García",
    time: "Hace 15 min",
    status: "pending",
    thumbnail: null,
  },
  {
    id: 6,
    puesto: "Puesto 345",
    mesa: "Mesa 1",
    user: "Diego Sánchez",
    time: "Hace 18 min",
    status: "verified",
    thumbnail: null,
  },
]

const statusConfig = {
  verified: {
    icon: CheckCircle,
    label: "Verificada",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  pending: {
    icon: Clock,
    label: "Pendiente",
    color: "text-neon-orange",
    bg: "bg-neon-orange/10",
  },
  issue: {
    icon: AlertTriangle,
    label: "Revisar",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
}

export function EvidenceGallery() {
  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Evidencias Recientes</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Actas y fotos de mesas</p>
        </div>
        <Button variant="secondary" size="sm" className="text-xs">
          Ver todas
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {evidences.map((evidence, index) => {
          const status = statusConfig[evidence.status as keyof typeof statusConfig]
          return (
            <motion.div
              key={evidence.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="group relative aspect-square rounded-lg bg-secondary/50 border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            >
              {/* Placeholder for image */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-background">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-1">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Acta</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`absolute top-1 right-1 p-1 rounded ${status.bg}`}>
                <status.icon className={`w-3 h-3 ${status.color}`} />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                <p className="text-xs font-medium text-foreground truncate">{evidence.puesto}</p>
                <p className="text-[10px] text-muted-foreground">{evidence.mesa}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{evidence.user}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-neon-green" />
            <span className="text-muted-foreground">3 verificadas</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neon-orange" />
            <span className="text-muted-foreground">2 pendientes</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span className="text-muted-foreground">1 por revisar</span>
          </div>
        </div>
        <span className="text-muted-foreground">Total: {evidences.length}</span>
      </div>
    </div>
  )
}
