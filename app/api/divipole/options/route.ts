import { NextRequest, NextResponse } from "next/server"
import { pool } from "@/lib/pg"

const emptyData = { departments: [], municipalities: [], puestos: [] }

type DepartmentRow = { dd: string; departamento: string }
type MunicipalityRow = { dd: string; mm: string; municipio: string }
type PuestoRow = {
  id: string
  dd: string
  mm: string
  pp: string
  departamento: string
  municipio: string
  puesto: string
  direccion: string | null
  mesas: number
  total: number
  latitud: number | null
  longitud: number | null
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const dept = searchParams.get("dept")?.trim() || null
  const muni = searchParams.get("muni")?.trim() || null

  if (!pool) {
    console.warn("DATABASE_URL not set; divipole options returning empty data")
    return NextResponse.json(emptyData)
  }

  try {
    const client = await pool.connect()
    try {
      if (!dept) {
        const { rows } = await client.query<DepartmentRow>(
          `SELECT DISTINCT dd, departamento FROM divipole_locations ORDER BY departamento`
        )
        return NextResponse.json({
          departments: rows.map((r) => ({ code: r.dd, name: r.departamento })),
        })
      }

      if (dept && !muni) {
        const { rows } = await client.query<MunicipalityRow>(
          `SELECT DISTINCT dd, mm, municipio FROM divipole_locations WHERE dd = $1 ORDER BY municipio`,
          [dept]
        )
        return NextResponse.json({
          municipalities: rows.map((r) => ({ code: r.mm, name: r.municipio, departmentCode: r.dd })),
        })
      }

      const { rows } = await client.query<PuestoRow>(
        `SELECT
            MIN(id) AS id,
            dd,
            mm,
            pp,
            departamento,
            municipio,
            puesto,
            direccion,
            MAX(mesas) AS mesas,
            MAX(total) AS total,
            MAX(latitud) AS latitud,
            MAX(longitud) AS longitud
         FROM divipole_locations
         WHERE dd = $1 AND mm = $2
         GROUP BY dd, mm, pp, departamento, municipio, puesto, direccion
         ORDER BY puesto
         LIMIT 1000`,
        [dept, muni]
      )
      return NextResponse.json({
        puestos: rows.map((r) => ({
          id: r.id,
          code: r.pp,
          name: r.puesto,
          departmentCode: r.dd,
          municipalityCode: r.mm,
          department: r.departamento,
          municipality: r.municipio,
          address: r.direccion,
          mesas: r.mesas,
          total: r.total,
          lat: r.latitud,
          lng: r.longitud,
        })),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("divipole options error", error)
    return NextResponse.json(emptyData)
  }
}
