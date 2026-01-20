"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Layers, Map } from "lucide-react"

export function TerritoryFilters() {
  return (
    <div className="glass rounded-xl border border-border/50 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar puesto, municipio, dirección..."
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {/* Department Filter */}
        <Select>
          <SelectTrigger className="w-full lg:w-48 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="bogota">Bogotá D.C.</SelectItem>
            <SelectItem value="antioquia">Antioquia</SelectItem>
            <SelectItem value="valle">Valle del Cauca</SelectItem>
            <SelectItem value="cundinamarca">Cundinamarca</SelectItem>
            <SelectItem value="atlantico">Atlántico</SelectItem>
          </SelectContent>
        </Select>

        {/* Municipality Filter */}
        <Select>
          <SelectTrigger className="w-full lg:w-48 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Municipio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-2">
            <Layers className="w-4 h-4" />
            Heatmap
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Map className="w-4 h-4" />
            3D
          </Button>
          <Button variant="outline" size="icon" className="bg-transparent">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
