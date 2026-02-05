"use client"

import { motion } from "framer-motion"
import { MapPin, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
type Feature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    id: string
    puesto: string
    municipio: string
    departamento: string
    direccion: string | null
    mesas?: number
    total?: number
    delegateAssigned?: boolean
  }
}

type Props = {
  features: Feature[]
  search: string
  onSearchChange: (v: string) => void
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function TerritoryTable({ features, search, onSearchChange, selectedId, onSelect }: Props) {
  const formatter = new Intl.NumberFormat("es-CO")
  const filtered = features.filter((p) => {
    const term = search.toLowerCase()
    return (
      p.properties.puesto.toLowerCase().includes(term) ||
      p.properties.municipio.toLowerCase().includes(term) ||
      p.properties.departamento.toLowerCase().includes(term)
    )
  })

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
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Sin resultados para estos filtros.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((puesto, index) => (
              <motion.div
                key={puesto.properties.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`p-3 hover:bg-secondary/30 cursor-pointer transition-colors ${
                  selectedId === puesto.properties.id ? "bg-secondary/50" : ""
                }`}
                onClick={() => onSelect?.(puesto.properties.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{puesto.properties.puesto}</p>
                      {(!puesto.geometry.coordinates || puesto.geometry.coordinates.length !== 2 ||
                        (puesto.geometry.coordinates[0] === 0 && puesto.geometry.coordinates[1] === 0)) && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-neon-orange/10 text-neon-orange">
                          Sin coords
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {puesto.properties.municipio}, {puesto.properties.departamento}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-neon-green" />
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground transition-transform ${
                        selectedId === puesto.properties.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>

                {selectedId === puesto.properties.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-3 pt-3 border-t border-border/50"
                  >
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground">Mesas</p>
                        <p className="text-sm font-semibold text-foreground">{puesto.properties.mesas ?? "-"}</p>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground">Votos</p>
                        <p className="text-sm font-semibold text-foreground">
                          {puesto.properties.total !== undefined ? formatter.format(puesto.properties.total) : "-"}
                        </p>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-[10px] text-muted-foreground">Estado</p>
                        <p className="text-sm font-semibold text-neon-green">Reportado</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect?.(puesto.properties.id)
                        }}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Ver en Mapa
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="p-3 border-t border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-neon-green" />
              <span className="text-muted-foreground">
                Reportes: {filtered.length}
              </span>
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
