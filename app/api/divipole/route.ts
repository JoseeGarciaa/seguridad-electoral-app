import { NextResponse } from "next/server"
import { pool } from "@/lib/pg"

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
    dd?: string
    mm?: string
    pp?: string
    delegateAssigned?: boolean
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
  dd: string | null
  mm: string | null
  pp: string | null
}

const mockFeatures: DivipoleFeature[] = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-74.1106, 4.6406] },
    properties: {
      id: "1",
      departamento: "Bogotá D.C.",
      municipio: "Bogotá",
      puesto: "Colegio Nacional",
      direccion: "Calle 26 # 30-15",
      mesas: 12,
      total: 6800,
      hombres: 3200,
      mujeres: 3600,
      dd: "11",
      mm: "001",
      pp: "001",
      delegateAssigned: true,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-74.083, 4.6097] },
    properties: {
      id: "2",
      departamento: "Bogotá D.C.",
      municipio: "Bogotá",
      puesto: "IE Kennedy",
      direccion: "Carrera 78 # 40-20",
      mesas: 15,
      total: 12500,
      hombres: 6000,
      mujeres: 6500,
      dd: "11",
      mm: "001",
      pp: "002",
      delegateAssigned: true,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.5636, 6.2518] },
    properties: {
      id: "3",
      departamento: "Antioquia",
      municipio: "Medellín",
      puesto: "IE Central",
      direccion: "Cra 50 # 52-40",
      mesas: 12,
      total: 9200,
      hombres: 4400,
      mujeres: 4800,
      dd: "05",
      mm: "001",
      pp: "003",
      delegateAssigned: false,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.3756, 6.1553] },
    properties: {
      id: "4",
      departamento: "Antioquia",
      municipio: "Rionegro",
      puesto: "Escuela Rural",
      direccion: "Vereda El Lago",
      mesas: 4,
      total: 2100,
      hombres: 1000,
      mujeres: 1100,
      dd: "05",
      mm: "054",
      pp: "004",
      delegateAssigned: false,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-76.5312, 3.4516] },
    properties: {
      id: "5",
      departamento: "Valle del Cauca",
      municipio: "Cali",
      puesto: "Colegio San José",
      direccion: "Calle 5 # 10-20",
      mesas: 10,
      total: 8500,
      hombres: 4100,
      mujeres: 4400,
      dd: "76",
      mm: "001",
      pp: "005",
      delegateAssigned: true,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-74.7989, 10.998] },
    properties: {
      id: "6",
      departamento: "Atlántico",
      municipio: "Barranquilla",
      puesto: "IE Norte",
      direccion: "Cra 45 # 80-90",
      mesas: 18,
      total: 14200,
      hombres: 7000,
      mujeres: 7200,
      dd: "08",
      mm: "001",
      pp: "006",
      delegateAssigned: true,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.5174, 10.4000] },
    properties: {
      id: "7",
      departamento: "Bolívar",
      municipio: "Cartagena",
      puesto: "Escuela 24",
      direccion: "Calle 24 # 10-50",
      mesas: 6,
      total: 4300,
      hombres: 2100,
      mujeres: 2200,
      dd: "13",
      mm: "001",
      pp: "007",
      delegateAssigned: false,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-73.1198, 7.1254] },
    properties: {
      id: "8",
      departamento: "Santander",
      municipio: "Bucaramanga",
      puesto: "Colegio Mayor",
      direccion: "Av. Quebradaseca",
      mesas: 9,
      total: 7500,
      hombres: 3600,
      mujeres: 3900,
      dd: "68",
      mm: "001",
      pp: "008",
      delegateAssigned: false,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-77.282, 1.212] },
    properties: {
      id: "9",
      departamento: "Nariño",
      municipio: "Pasto",
      puesto: "IE Sur",
      direccion: "Cra 2 # 10-15",
      mesas: 7,
      total: 5200,
      hombres: 2500,
      mujeres: 2700,
      dd: "52",
      mm: "001",
      pp: "009",
      delegateAssigned: true,
    },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-75.6961, 4.8133] },
    properties: {
      id: "10",
      departamento: "Risaralda",
      municipio: "Pereira",
      puesto: "Escuela Central",
      direccion: "Calle 17 # 8-20",
      mesas: 11,
      total: 8900,
      hombres: 4300,
      mujeres: 4600,
      dd: "66",
      mm: "001",
      pp: "010",
      delegateAssigned: false,
    },
  },
]

// Expected query: /api/divipole?bbox=minLng,minLat,maxLng,maxLat&limit=2000
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const bbox = searchParams.get("bbox")
  const dept = searchParams.get("dept")?.trim() || null
  const muni = searchParams.get("muni")?.trim() || null
  const search = searchParams.get("search")?.trim() || null
  const race = (searchParams.get("race")?.trim() || "all").toLowerCase()
  const limitParam = searchParams.get("limit")

  const limit = Math.min(Number(limitParam) || 2000, 5000)

  const citrepSet = new Set(
    (process.env.CITREP_MUN_CODES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  )
  const citrepOnly = race === "citrep"

  let bboxParts: number[] | null = null
  if (bbox) {
    const parsed = bbox.split(",").map((p) => Number(p.trim()))
    if (parsed.length === 4 && !parsed.some((n) => Number.isNaN(n))) {
      bboxParts = parsed
    }
  }

  if (!pool) {
    return NextResponse.json({ error: "DATABASE_URL requerido para consultar puestos" }, { status: 500 })
  }

  try {
    const conditions: string[] = ["latitud IS NOT NULL", "longitud IS NOT NULL"]
    const params: Array<string | number | string[]> = []
    let idx = 1

    if (bboxParts) {
      const [minLng, minLat, maxLng, maxLat] = bboxParts
      params.push(minLat, maxLat, minLng, maxLng)
      conditions.push(`latitud BETWEEN $${idx} AND $${idx + 1}`)
      conditions.push(`longitud BETWEEN $${idx + 2} AND $${idx + 3}`)
      idx += 4
    }

    if (dept) {
      conditions.push(`dd = $${idx}`)
      params.push(dept)
      idx += 1
    }

    if (muni) {
      conditions.push(`mm = $${idx}`)
      params.push(muni)
      idx += 1
    }

    if (citrepOnly) {
      if (!citrepSet.size) {
        return NextResponse.json({ type: "FeatureCollection", features: [] })
      }
      conditions.push(`(dd || mm) = ANY($${idx}::text[])`)
      params.push(Array.from(citrepSet))
      idx += 1
    }

    if (search) {
      conditions.push(`(puesto ILIKE $${idx} OR municipio ILIKE $${idx})`)
      params.push(`%${search}%`)
      idx += 1
    }

    const totalsQuery = await pool.query<{ total_puestos: string; total_mesas: string; with_coords: string }>(
      `SELECT
         COUNT(*) AS total_puestos,
         COALESCE(SUM(mesas), 0) AS total_mesas,
         COUNT(*) AS with_coords
       FROM divipole_locations
       WHERE ${conditions.join(" AND ")}`,
      params,
    )

    const { rows } = await pool.query<DivipoleRow>(
      `SELECT
         id,
         departamento,
         municipio,
         puesto,
         direccion,
         mesas,
         total,
         hombres,
         mujeres,
         latitud,
         longitud,
         dd,
         mm,
         pp
       FROM divipole_locations
       WHERE ${conditions.join(" AND ")}
       ORDER BY total DESC NULLS LAST
       LIMIT $${idx}`,
      [...params, limit]
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
        dd: loc.dd ?? undefined,
        mm: loc.mm ?? undefined,
        pp: loc.pp ?? undefined,
      },
    }))

    const totals = {
      total_puestos: Number(totalsQuery.rows[0]?.total_puestos ?? 0),
      total_mesas: Number(totalsQuery.rows[0]?.total_mesas ?? 0),
      with_coords: Number(totalsQuery.rows[0]?.with_coords ?? 0),
    }

    return NextResponse.json({ type: "FeatureCollection", features, totals })
  } catch (error) {
    console.error("divipole api error", error)
    return NextResponse.json({ error: "server error" }, { status: 500 })
  }
}
