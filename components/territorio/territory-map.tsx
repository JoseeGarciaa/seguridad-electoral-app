"use client"

import "maplibre-gl/dist/maplibre-gl.css"
import { useEffect, useRef, useState } from "react"
import maplibregl, { Map as MLMap, GeoJSONSource } from "maplibre-gl"
import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewMode = "circle" | "heatmap" | "3d"

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
    dd?: string
    mm?: string
    pp?: string
    delegateAssigned?: boolean
    delegateName?: string | null
    delegateEmail?: string | null
    delegatePhone?: string | null
    votersPerMesa?: number | null
    reportedMesas?: number | null
  }
}

// Sanitize incoming features to avoid MapLibre runtime errors when numeric props are missing/undefined.
function normalizeFeatures(features: Feature[]): Feature[] {
  return features
    .filter((f) => Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length === 2)
    .map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        mesas: Number.isFinite(f.properties.mesas) ? Number(f.properties.mesas) : 0,
        total: Number.isFinite(f.properties.total) ? Number(f.properties.total) : 0,
        votersPerMesa: Number.isFinite(f.properties.votersPerMesa ?? NaN)
          ? Number(f.properties.votersPerMesa)
          : null,
      },
    }))
}

// Raster OSM libre con etiquetas visibles (sin claves ni CORS externas)
const TILE_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
}

type Props = {
  viewMode: ViewMode
  features: Feature[]
  onViewModeChange?: (v: ViewMode) => void
  selectedId?: string | null
  onSelect?: (id: string) => void
  selectionVersion?: number
}

export function TerritoryMap({ viewMode, features, onViewModeChange, selectedId, onSelect, selectionVersion }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current || mapError) return

    let map: MLMap | null = null

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: TILE_STYLE,
        center: [-74.1, 4.65],
        zoom: 5,
        pitch: 0,
        attributionControl: true,
      })
    } catch (err) {
      console.error("MapLibre init error", err)
      setMapError("No se pudo cargar el mapa")
      return
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-left")

    // Avoid unhandled runtime errors from style/glyph fetch issues
    map.on("error", (e) => {
      console.error("MapLibre error", e.error)
      if (!map) return
      // Some style errors bubble as runtime exceptions; fail soft by tearing down the map and showing a placeholder.
      map.remove()
      mapRef.current = null
      setMapError("No se pudo renderizar el mapa")
    })

    map.on("load", async () => {
      map.addSource("puestos", {
        type: "geojson",
        data: { type: "FeatureCollection", features: normalizeFeatures(features) },
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
          "text-size": 12,
        },
        paint: {
          "text-color": "#0b1120",
        },
      })

      addPointsLayer(map, viewMode)

      const src = map.getSource("puestos") as GeoJSONSource | undefined
      src?.setData({ type: "FeatureCollection", features: normalizeFeatures(features) })

      // Enfocar a la extensión de los puntos
      const bounds = new maplibregl.LngLatBounds()
      normalizeFeatures(features).forEach((f) => bounds.extend(f.geometry.coordinates))
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 400 })
      }

      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const clusterId = feature.properties?.cluster_id
        const source = map.getSource("puestos") as GeoJSONSource
        if (!source || clusterId === undefined) return
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom })
        })
      })

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0] as Feature | undefined
        if (!feature) return
        const coords = feature.geometry.coordinates
        const props = feature.properties
        const votersPerMesa = props.votersPerMesa ? Math.round(props.votersPerMesa) : null
        const delegateHtml = props.delegateAssigned && props.delegateName ? props.delegateName : "Sin testigo electoral"
        onSelect?.(props.id)
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(`
            <div class="space-y-1 text-sm">
              <div class="font-semibold" style="color:#000">${props.puesto}</div>
              <div class="text-muted-foreground">${props.municipio}, ${props.departamento}</div>
              <div class="text-muted-foreground text-xs">Mesas: ${props.mesas?.toLocaleString?.() ?? "-"} · Votantes: ${
            props.total?.toLocaleString?.() ?? "-"
          }</div>
              <div class="text-muted-foreground text-xs">Votantes / mesa: ${votersPerMesa ? votersPerMesa.toLocaleString?.() : "-"}</div>
              <div class="text-xs" style="color:${props.delegateAssigned ? "#16a34a" : "#f59e0b"}">Delegado: ${delegateHtml}</div>
            </div>
          `)
          .addTo(map)
      })

      map.on("mouseenter", "unclustered-point", () => {
        map.getCanvas().style.cursor = "pointer"
      })
      map.on("mouseleave", "unclustered-point", () => {
        map.getCanvas().style.cursor = ""
      })
    })

    mapRef.current = map

    return () => {
      try {
        if (map && (map as any).style) {
          map.remove()
        }
      } catch (err) {
        console.error("Map cleanup error", err)
      }
      mapRef.current = null
    }
  }, [mapError])

  useEffect(() => {
    if (!mapRef.current) return
    applyViewMode(mapRef.current, viewMode)
  }, [viewMode])

  useEffect(() => {
    if (!mapRef.current) return
    const src = mapRef.current.getSource("puestos") as GeoJSONSource | undefined
    if (!src) return
    const normalized = normalizeFeatures(features)
    src.setData({ type: "FeatureCollection", features: normalized })

    // Ajustar a la extensión cuando cambian los datos
    if (normalized.length) {
      const bounds = new maplibregl.LngLatBounds()
      normalized.forEach((f) => bounds.extend(f.geometry.coordinates))
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 300 })
    }
  }, [features])

  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const feature = features.find((f) => f.properties.id === selectedId)
    if (!feature) return
    const [lng, lat] = feature.geometry.coordinates
    mapRef.current.easeTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 11) })
    const votersPerMesa = feature.properties.votersPerMesa ? Math.round(feature.properties.votersPerMesa) : null
    const delegateHtml = feature.properties.delegateAssigned && feature.properties.delegateName
      ? feature.properties.delegateName
      : "Sin testigo electoral"
    new maplibregl.Popup({ closeButton: true })
      .setLngLat([lng, lat])
      .setHTML(`
        <div class="space-y-1 text-sm">
          <div class="font-semibold" style="color:#000">${feature.properties.puesto}</div>
          <div class="text-muted-foreground">${feature.properties.municipio}, ${feature.properties.departamento}</div>
          <div class="text-muted-foreground text-xs">Mesas: ${feature.properties.mesas?.toLocaleString?.() ?? "-"} · Votantes: ${
        feature.properties.total?.toLocaleString?.() ?? "-"
      }</div>
          <div class="text-muted-foreground text-xs">Votantes / mesa: ${votersPerMesa ? votersPerMesa.toLocaleString?.() : "-"}</div>
          <div class="text-xs" style="color:${feature.properties.delegateAssigned ? "#16a34a" : "#f59e0b"}">Delegado: ${delegateHtml}</div>
        </div>
      `)
      .addTo(mapRef.current)
  }, [selectedId, selectionVersion, features])

  if (mapError) {
    return (
      <div className="glass rounded-xl border border-border/50 h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
        {mapError}
      </div>
    )
  }

  return (
    <div className="glass rounded-xl border border-border/50 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Mapa Territorial</span>
          <span className="text-xs text-muted-foreground">• datos en vivo</span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground ml-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />Asignado</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Sin asignar</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
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

function addPointsLayer(map: MLMap, mode: ViewMode) {
  if (!map.getSource("puestos")) return
  if (map.getLayer("unclustered-point")) {
    map.removeLayer("unclustered-point")
  }

  map.addLayer({
    id: "unclustered-point",
    type: mode === "heatmap" ? "heatmap" : "circle",
    source: "puestos",
    filter: ["!", ["has", "point_count"]],
    paint:
      mode === "heatmap"
        ? {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "total"], 0, 0, 500, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 12, 2],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 5, 15, 12, 30],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 12, 0.9],
          }
        : {
            "circle-color": [
              "case",
              ["==", ["get", "delegateAssigned"], true],
              "#22c55e",
              "#f59e0b",
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "total"],
              0,
              4,
              50,
              6,
              150,
              10,
              300,
              14,
              600,
              18,
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#0f172a",
            "circle-opacity": 0.9,
          },
  })
}

function applyViewMode(map: MLMap, mode: ViewMode) {
  if (!map.getSource("puestos")) return
  addPointsLayer(map, mode)
  if (mode === "3d") {
    map.easeTo({ pitch: 55, duration: 300 })
  } else {
    map.easeTo({ pitch: 0, duration: 300 })
  }
}
