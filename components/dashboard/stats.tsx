"use client"

import { motion } from "framer-motion"
import { Building2, Users, CheckCircle, AlertTriangle } from "lucide-react"

const stats = [
  {
    name: "Puestos de Votación",
    value: "12,847",
    change: "+100%",
    changeType: "positive",
    icon: Building2,
    description: "Cobertura DIVIPOLE",
  },
  {
    name: "Testigos Asignados",
    value: "892",
    change: "+24",
    changeType: "positive",
    icon: Users,
    description: "Activos hoy",
  },
  {
    name: "Reportes Verificados",
    value: "1,247",
    change: "+156",
    changeType: "positive",
    icon: CheckCircle,
    description: "Últimas 24h",
  },
  {
    name: "Alertas Activas",
    value: "3",
    change: "-2",
    changeType: "negative",
    icon: AlertTriangle,
    description: "Requieren atención",
  },
]

export function DashboardStats() {
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
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              stat.changeType === "positive" 
                ? "bg-neon-green/10 text-neon-green" 
                : "bg-destructive/10 text-destructive"
            }`}>
              {stat.change}
            </span>
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
