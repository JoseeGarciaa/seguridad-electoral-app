"use client"

import { motion } from "framer-motion"

const municipalities = [
  { name: "Bogotá D.C.", coverage: 92, status: "green" },
  { name: "Medellín", coverage: 88, status: "green" },
  { name: "Cali", coverage: 76, status: "yellow" },
  { name: "Barranquilla", coverage: 85, status: "green" },
  { name: "Cartagena", coverage: 72, status: "yellow" },
  { name: "Bucaramanga", coverage: 45, status: "red" },
  { name: "Pereira", coverage: 68, status: "yellow" },
  { name: "Manizales", coverage: 91, status: "green" },
  { name: "Cúcuta", coverage: 52, status: "yellow" },
  { name: "Santa Marta", coverage: 38, status: "red" },
  { name: "Ibagué", coverage: 87, status: "green" },
  { name: "Pasto", coverage: 82, status: "yellow" },
]

const statusColors = {
  green: "bg-neon-green",
  yellow: "bg-neon-orange",
  red: "bg-destructive",
}

const statusBg = {
  green: "bg-neon-green/10",
  yellow: "bg-neon-orange/10",
  red: "bg-destructive/10",
}

export function MunicipalTrafficLight() {
  const grouped = {
    green: municipalities.filter(m => m.status === "green"),
    yellow: municipalities.filter(m => m.status === "yellow"),
    red: municipalities.filter(m => m.status === "red"),
  }

  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Semáforo Municipal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Cobertura de testigos por municipio</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-green" />
            <span className="text-muted-foreground">{"≥85%"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-neon-orange" />
            <span className="text-muted-foreground">50-84%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-muted-foreground">{"<50%"}</span>
          </div>
        </div>
      </div>

      {/* Grid of municipalities */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
        {municipalities.map((municipality, index) => (
          <motion.div
            key={municipality.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className={`p-3 rounded-lg ${statusBg[municipality.status as keyof typeof statusBg]} border border-border/30 hover:border-border/60 transition-colors cursor-pointer`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`w-2 h-2 rounded-full ${statusColors[municipality.status as keyof typeof statusColors]}`} />
              <span className="text-xs font-bold text-foreground">{municipality.coverage}%</span>
            </div>
            <p className="text-xs font-medium text-foreground truncate">{municipality.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-green">{grouped.green.length}</p>
          <p className="text-xs text-muted-foreground">Óptimo</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-orange">{grouped.yellow.length}</p>
          <p className="text-xs text-muted-foreground">Atención</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive">{grouped.red.length}</p>
          <p className="text-xs text-muted-foreground">Crítico</p>
        </div>
      </div>
    </div>
  )
}
