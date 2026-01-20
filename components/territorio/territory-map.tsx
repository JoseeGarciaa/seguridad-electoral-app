"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MLMap, GeoJSONSource, LngLatBoundsLike } from "maplibre-gl"
import { Maximize2, Minimize2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

type Feature = {
  type: "Feature"
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    id: string
    departamento: string
    municipio: string
    puesto: string
    direccion: string | null
    mesas: number
    total: number
    hombres: number
    mujeres: number
  }
}

const TILE_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

export function TerritoryMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<"circle" | "heatmap">("circle")

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: [-74.1, 4.65],
      zoom: 5,
      pitch: 0,
      attributionControl: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left")

    map.on("load", async () => {
      map.addSource("puestos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 40,
      })

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "puestos",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#0ea5e9",
            50,
            "#06b6d4",
            200,
            "#22c55e",
            500,
            "#f97316",
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            50,
            18,
            200,
            24,
            500,
            32,
          ],
          "circle-opacity": 0.9,
        },
      })

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "puestos",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#0b1120",
        },
      })

      map.addLayer({
        id: "unclustered-point",
        type: viewMode === "heatmap" ? "heatmap" : "circle",
        source: "puestos",
        filter: ["!", ["has", "point_count"]],
        paint:
          viewMode === "heatmap"
            ? {
                "heatmap-weight": ["interpolate", ["linear"], ["get", "total"], 0, 0, 500, 1],
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 12, 2],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 15, 12, 30],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 12, 0.9],
              }
            : {
                "circle-color": "#22c55e",
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 12, 8, 16, 14],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#0f172a",
                "circle-opacity": 0.9,
              },
      })

      map.on("moveend", async () => {
        await fetchAndSetData(map)
      })

      await fetchAndSetData(map)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [viewMode])

  const fetchAndSetData = async (map: MLMap) => {
    const src = map.getSource("puestos") as GeoJSONSource | undefined
    if (!src) return
    const bounds = map.getBounds().toArray().flat()
    const bbox = bounds.join(",")
    const res = await fetch(`/api/divipole?bbox=${bbox}&limit=2000`)
    if (!res.ok) return
    const geojson = (await res.json()) as { type: "FeatureCollection"; features: Feature[] }
    src.setData(geojson)
  }

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Mapa Territorial</span>
          <span className="text-xs text-muted-foreground">• datos en vivo</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode(viewMode === "heatmap" ? "circle" : "heatmap")}
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              if (!mapRef.current) return
              if (!isFullscreen) {
                mapRef.current.getContainer().requestFullscreen?.()
              } else {
                document.exitFullscreen?.()
              }
              setIsFullscreen(!isFullscreen)
            }}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1" />
    </div>
  )
}
