"use client"

import { motion } from "framer-motion"

const departments = [
  { name: "Bogotá D.C.", coverage: 92, puestos: 1247, status: "green" },
  { name: "Antioquia", coverage: 88, puestos: 1156, status: "green" },
  { name: "Valle del Cauca", coverage: 76, puestos: 892, status: "yellow" },
  { name: "Cundinamarca", coverage: 85, puestos: 743, status: "green" },
  { name: "Atlántico", coverage: 72, puestos: 456, status: "yellow" },
  { name: "Santander", coverage: 45, puestos: 534, status: "red" },
  { name: "Bolívar", coverage: 68, puestos: 412, status: "yellow" },
  { name: "Nariño", coverage: 82, puestos: 387, status: "yellow" },
]

const statusColors = {
  green: "bg-neon-green",
  yellow: "bg-neon-orange",
  red: "bg-destructive",
}

const statusLabels = {
  green: "Óptimo",
  yellow: "Atención",
  red: "Crítico",
}

export function CoverageOverview() {
  return (
    <div className="glass rounded-xl border border-border/50 p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Cobertura por Departamento</h2>
          <p className="text-xs text-muted-foreground mt-1">Semáforo de cobertura electoral</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-green" />
            <span className="text-xs text-muted-foreground">{"≥85%"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-orange" />
            <span className="text-xs text-muted-foreground">50-84%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-xs text-muted-foreground">{"<50%"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {departments.map((dept, index) => (
          <motion.div
            key={dept.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusColors[dept.status as keyof typeof statusColors]}`} />
                <span className="text-sm font-medium text-foreground">{dept.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{dept.puestos} puestos</span>
                <span className="text-sm font-semibold text-foreground w-12 text-right">{dept.coverage}%</span>
              </div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${dept.coverage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`h-full rounded-full ${statusColors[dept.status as keyof typeof statusColors]}`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border/50 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-green">5</p>
          <p className="text-xs text-muted-foreground">Óptimos</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-orange">4</p>
          <p className="text-xs text-muted-foreground">Atención</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive">1</p>
          <p className="text-xs text-muted-foreground">Críticos</p>
        </div>
      </div>
    </div>
  )
}
