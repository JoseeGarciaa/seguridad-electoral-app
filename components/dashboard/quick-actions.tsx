"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { 
  Map, 
  Camera, 
  UserPlus, 
  FileUp, 
  Bell,
  Target
} from "lucide-react"

export function QuickActions({ pendingAlerts }: { pendingAlerts: number }) {
  const actions = [
    {
      name: "Ver Mapa",
      description: "Territorio PRO",
      href: "/dashboard/territorio",
      icon: Map,
      color: "bg-primary/10 text-primary",
    },
    {
      name: "War Room",
      description: "Día Electoral",
      href: "/dashboard/warroom",
      icon: Target,
      color: "bg-neon-cyan/10 text-neon-cyan",
    },
    {
      name: "Subir Evidencia",
      description: "Actas y fotos",
      href: "/dashboard/evidencias",
      icon: Camera,
      color: "bg-neon-orange/10 text-neon-orange",
    },
    {
      name: "Agregar Testigo",
      description: "Nuevo miembro",
      href: "/dashboard/equipo",
      icon: UserPlus,
      color: "bg-accent/10 text-accent",
    },
    {
      name: "Ver Alertas",
      description: `${pendingAlerts} pendientes`,
      href: "/dashboard/alertas",
      icon: Bell,
      color: "bg-destructive/10 text-destructive",
    },
  ]

  return (
    <div className="glass rounded-xl border border-border/50 p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Acciones Rápidas</h2>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((action, index) => (
          <motion.div
            key={action.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-center group"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} transition-transform group-hover:scale-110`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{action.name}</p>
                <p className="text-[10px] text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          </motion.div>

        ))}
