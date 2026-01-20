import { NextResponse } from "next/server"
import { Pool } from "pg"

type DivipoleFeature = {
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

type DivipoleRow = {
  id: string
  departamento: string
  municipio: string
  puesto: string
  direccion: string | null
  mesas: number
  total: number
  hombres: number
  mujeres: number
  latitud: number
  longitud: number
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Expected query: /api/divipole?bbox=minLng,minLat,maxLng,maxLat&limit=2000
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bbox = searchParams.get("bbox")
  const limitParam = searchParams.get("limit")

  if (!bbox) {
    return NextResponse.json({ error: "bbox required" }, { status: 400 })
  }

  const parts = bbox.split(",").map((p) => Number(p.trim()))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "invalid bbox" }, { status: 400 })
  }

  const [minLng, minLat, maxLng, maxLat] = parts
  const limit = Math.min(Number(limitParam) || 2000, 5000)

  try {
    const { rows } = await pool.query<DivipoleRow>(
      `SELECT id, departamento, municipio, puesto, direccion, mesas, total, hombres, mujeres, latitud, longitud
       FROM divipole_locations
       WHERE latitud IS NOT NULL AND longitud IS NOT NULL
         AND latitud BETWEEN $1 AND $2
         AND longitud BETWEEN $3 AND $4
       LIMIT $5`,
      [minLat, maxLat, minLng, maxLng, limit]
    )

    const features: DivipoleFeature[] = rows.map((loc: DivipoleRow): DivipoleFeature => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [loc.longitud!, loc.latitud!],
      },
      properties: {
        id: loc.id,
        departamento: loc.departamento,
        municipio: loc.municipio,
        puesto: loc.puesto,
        direccion: loc.direccion,
        mesas: loc.mesas,
        total: loc.total,
        hombres: loc.hombres,
        mujeres: loc.mujeres,
      },
    }))

    return NextResponse.json({ type: "FeatureCollection", features })
  } catch (error) {
    console.error("divipole api error", error)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}
