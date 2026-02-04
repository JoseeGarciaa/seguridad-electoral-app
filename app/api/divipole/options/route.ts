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

type AssignedRow = { polling_station: string; nums: number[] | null }

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

      // Puestos deben ser únicos por (dd, mm, pp); no agregamos ni mezclamos otros municipios/departamentos
      const { rows } = await client.query<PuestoRow>(
        `SELECT
            id,
            dd,
            mm,
            pp,
            departamento,
            municipio,
            puesto,
            direccion,
            mesas,
            total,
            latitud,
            longitud
         FROM divipole_locations
         WHERE dd = $1 AND mm = $2
         ORDER BY puesto` ,
        [dept, muni]
      )

      const codes = rows.map((r) => r.pp).filter(Boolean)
      let assigned: Record<string, number[]> = {}
      if (codes.length) {
        const assignedRes = await client.query<AssignedRow>(
          `SELECT polling_station, array_agg(DISTINCT polling_station_number) AS nums
           FROM delegate_polling_assignments
           WHERE polling_station = ANY($1) AND polling_station_number IS NOT NULL
           GROUP BY polling_station`,
          [codes]
        )
        assigned = Object.fromEntries(
          assignedRes.rows.map((r) => [r.polling_station, (r.nums ?? []).filter((n) => Number.isInteger(n))])
        )
      }

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
          takenTables: assigned[r.pp] ?? [],
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
