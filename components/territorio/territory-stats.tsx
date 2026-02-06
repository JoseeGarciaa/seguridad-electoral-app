"use client"

import { motion } from "framer-motion"
import { Building2, MapPin, Users, LayoutGrid } from "lucide-react"

type Props = {
  totalPuestos: number
  totalMesas: number
  totalVotantes: number
  puestosConCoord: number
  mesasAsignadas: number
  mesasReportadas: number
  cobertura: number
}

const numberFormatter = new Intl.NumberFormat("es-CO")

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.trunc(value)))

export function TerritoryStats({ totalPuestos, totalMesas, totalVotantes, puestosConCoord, mesasAsignadas, mesasReportadas, cobertura }: Props) {
  const stats = [
    { name: "Puestos de votación", value: formatNumber(totalPuestos), icon: Building2 },
    { name: "Mesas disponibles", value: formatNumber(totalMesas), icon: LayoutGrid },
    { name: "Votantes estimados", value: formatNumber(totalVotantes), icon: Users },
    { name: "Puestos con coordenadas", value: formatNumber(puestosConCoord), icon: MapPin },
  ]

  return (
    <div className="space-y-3">
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

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="glass rounded-lg border border-border/50 p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Mesas asignadas vs reportadas</p>
            <p className="text-sm font-semibold text-foreground">Cobertura {formatNumber(cobertura)}%</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary" />Asignadas {formatNumber(mesasAsignadas)}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-neon-green" />Reportadas {formatNumber(mesasReportadas)}</span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary/60 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-neon-green"
            style={{ width: `${Math.min(100, cobertura)}%` }}
          />
        </div>
      </motion.div>
    </div>
  )
}
