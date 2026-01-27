"use client"

import { motion } from "framer-motion"
import { MapPin, Users, Building2, CheckCircle } from "lucide-react"

type Props = {
  total: number
  withCoords: number
  assigned: number
  coveragePct: number
}

const numberFormatter = new Intl.NumberFormat("es-CO")

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.trunc(value)))

export function TerritoryStats({ total, withCoords, assigned, coveragePct }: Props) {
  const stats = [
    { name: "Puestos Totales", value: formatNumber(total), icon: Building2 },
    { name: "Con Coordenadas", value: formatNumber(withCoords), icon: MapPin },
    { name: "Testigos Asignados", value: formatNumber(assigned), icon: Users },
    { name: "Cobertura", value: `${Math.round(Math.max(0, coveragePct))}%`, icon: CheckCircle },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass rounded-lg border border-border/50 p-3 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <stat.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.name}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
