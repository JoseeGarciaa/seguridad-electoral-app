"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MapPin, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const mockPuestos = [
  { id: 1, puesto: "IE Kennedy", municipio: "Bogotá", departamento: "Bogotá D.C.", mesas: 15, total: 12500, hasCoords: true, hasDelegate: true },
  { id: 2, puesto: "Colegio Nacional", municipio: "Bogotá", departamento: "Bogotá D.C.", mesas: 8, total: 6800, hasCoords: true, hasDelegate: true },
  { id: 3, puesto: "IE Central", municipio: "Medellín", departamento: "Antioquia", mesas: 12, total: 9200, hasCoords: true, hasDelegate: false },
  { id: 4, puesto: "Escuela Rural", municipio: "Rionegro", departamento: "Antioquia", mesas: 4, total: 2100, hasCoords: false, hasDelegate: false },
  { id: 5, puesto: "Colegio San José", municipio: "Cali", departamento: "Valle", mesas: 10, total: 8500, hasCoords: true, hasDelegate: true },
  { id: 6, puesto: "IE Norte", municipio: "Barranquilla", departamento: "Atlántico", mesas: 18, total: 14200, hasCoords: true, hasDelegate: true },
  { id: 7, puesto: "Escuela 24", municipio: "Cartagena", departamento: "Bolívar", mesas: 6, total: 4300, hasCoords: true, hasDelegate: false },
  { id: 8, puesto: "Colegio Mayor", municipio: "Bucaramanga", departamento: "Santander", mesas: 9, total: 7500, hasCoords: false, hasDelegate: false },
  { id: 9, puesto: "IE Sur", municipio: "Pasto", departamento: "Nariño", mesas: 7, total: 5200, hasCoords: true, hasDelegate: true },
  { id: 10, puesto: "Escuela Central", municipio: "Pereira", departamento: "Risaralda", mesas: 11, total: 8900, hasCoords: true, hasDelegate: false },
]

export function TerritoryTable() {
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtered = mockPuestos.filter(p => 
    p.puesto.toLowerCase().includes(search.toLowerCase()) ||
    p.municipio.toLowerCase().includes(search.toLowerCase()) ||
    p.departamento.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Puestos de Votación</h3>
          <span className="text-xs text-muted-foreground">{filtered.length} resultados</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar puesto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-border/50">
          {filtered.map((puesto, index) => (
            <motion.div
              key={puesto.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className={`p-3 hover:bg-secondary/30 cursor-pointer transition-colors ${
                selectedId === puesto.id ? "bg-secondary/50" : ""
              }`}
              onClick={() => setSelectedId(selectedId === puesto.id ? null : puesto.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{puesto.puesto}</p>
                    {!puesto.hasCoords && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-neon-orange/10 text-neon-orange">
                        Sin coords
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {puesto.municipio}, {puesto.departamento}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {puesto.hasDelegate ? (
                    <CheckCircle className="w-4 h-4 text-neon-green" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-neon-orange" />
                  )}
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${
                    selectedId === puesto.id ? "rotate-90" : ""
                  }`} />
                </div>
              </div>

              {/* Expanded Details */}
              {selectedId === puesto.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="mt-3 pt-3 border-t border-border/50"
                >
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-[10px] text-muted-foreground">Mesas</p>
                      <p className="text-sm font-semibold text-foreground">{puesto.mesas}</p>
                    </div>
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-[10px] text-muted-foreground">Votantes</p>
                      <p className="text-sm font-semibold text-foreground">{puesto.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/50 rounded p-2">
                      <p className="text-[10px] text-muted-foreground">Estado</p>
                      <p className={`text-sm font-semibold ${puesto.hasDelegate ? "text-neon-green" : "text-neon-orange"}`}>
                        {puesto.hasDelegate ? "Asignado" : "Pendiente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1 h-8 text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      Ver en Mapa
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs bg-primary text-primary-foreground">
                      Asignar Testigo
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Summary */}
      <div className="p-3 border-t border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-neon-green" />
              <span className="text-muted-foreground">Asignados: 5</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-neon-orange" />
              <span className="text-muted-foreground">Pendientes: 5</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}
